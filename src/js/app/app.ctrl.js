(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('AppController', AppController)
    .value('context', new AudioContext())
    .directive('ngRightClick', function($parse) {
      return function(scope, element, attrs) {
        var fn = $parse(attrs.ngRightClick);
        element.bind('contextmenu', function(event) {
          scope.$apply(function() {
            event.preventDefault();
            fn(scope, {$event:event});
          });
        });
      };
    });

  function AppController($scope, $timeout, context, audioPlayer, audioVisualiser,
                         Notes, Section, Timeline, HighlightTimeline) {
    audioVisualiser.initialize(context, audioPlayer.bass.audio);
    audioPlayer.drums.audio.connect(context.destination);
    audioPlayer.bass.audio.connect(context.destination);

    $scope.player = {
      playing: false,
      bpm: 80,
      bass: audioPlayer.bass,
      drums: audioPlayer.drums,
      input: audioPlayer.input,
      countdown: false,
      loop: true,
      playbackRange: {
        start: 1,
        end: 1
      },
      graphEnabled: false
    };
    // initial volume for input after un-mute
    audioPlayer.input._volume = 0.75;

    var bassNotes = new Notes('B0', 'G4');
    $scope.bass = {
      notes: bassNotes,
      stringFret: function(stringIndex, note) {
        var noteName = note.name + note.octave;
        var index = bassNotes.list.indexOf(bassNotes.map[noteName]);
        var fret = index - $scope.bass.strings[stringIndex].noteIndex;
        return (fret >= 0 && fret <= 24)? fret : -1;
      },
      xstrings: [
        {
          label: 'B',
          octave: 0,
          index: 0,
          noteIndex: bassNotes.list.indexOf(bassNotes.map['B0']),
          toJSON: function() {
            return this.index;
          }
        }, {
          label: 'E',
          octave: 1,
          index: 1,
          noteIndex: bassNotes.list.indexOf(bassNotes.map['E1']),
          toJSON: function() {
            return this.index;
          }
        }, {
          label: 'A',
          octave: 1,
          index: 2,
          noteIndex: bassNotes.list.indexOf(bassNotes.map['A1']),
          toJSON: function() {
            return this.index;
          }
        }, {
          label: 'D',
          octave: 2,
          index: 3,
          noteIndex: bassNotes.list.indexOf(bassNotes.map['D2']),
          toJSON: function() {
            return this.index;
          }
        }, {
          label: 'G',
          octave: 2,
          index: 4,
          noteIndex: bassNotes.list.indexOf(bassNotes.map['G2']),
          toJSON: function() {
            return this.index;
          }
        }
      ],
      strings: [
        {
          label: 'E',
          octave: 1,
          index: 0,
          noteIndex: bassNotes.list.indexOf(bassNotes.map['E1']),
          toJSON: function() {
            return this.index;
          }
        }, {
          label: 'A',
          octave: 1,
          index: 1,
          noteIndex: bassNotes.list.indexOf(bassNotes.map['A1']),
          toJSON: function() {
            return this.index;
          }
        }, {
          label: 'D',
          octave: 2,
          index: 2,
          noteIndex: bassNotes.list.indexOf(bassNotes.map['D2']),
          toJSON: function() {
            return this.index;
          }
        }, {
          label: 'G',
          octave: 2,
          index: 3,
          noteIndex: bassNotes.list.indexOf(bassNotes.map['G2']),
          toJSON: function() {
            return this.index;
          }
        }
      ],
      playingStyles: [
        {
          name: 'finger',
          label: 'Finger'
        }, {
          name: 'slap',
          label: 'Slap'
        }, {
          name: 'pop',
          label: 'Pop'
        }, {
          name: 'pick',
          label: 'Pick'
        }, {
          name: 'tap',
          label: 'Tap'
        }, {
          name: 'hammer',
          label: 'Hammer-On'
        }, {
          name: 'pull',
          label: 'Pull-Off'
        }, {
          name: 'ring',
          label: 'Let ring'
        }
      ],
      settings: {
        label: 'name-and-fret'
      }
    };
    $scope.drums = [
      {
        name: 'tom1',
        label: 'Tom 1',
        filename: 'sounds/drums/acoustic-kit/tom1',
        duration: 0.41
      }, {
        name: 'tom2',
        label: 'Tom 2',
        filename: 'sounds/drums/acoustic-kit/tom2',
        duration: 0.6
      }, {
        name: 'tom3',
        label: 'Tom 3',
        filename: 'sounds/drums/acoustic-kit/tom3',
        duration: 1.0
      }, {
        name: 'hihat',
        label: 'Hi-Hat',
        filename: 'sounds/drums/acoustic-kit/hihat',
        duration: 0.25
      }, {
        name: 'snare',
        label: 'Snare',
        filename: 'sounds/drums/acoustic-kit/snare',
        duration: 0.36
      }, {
        name: 'kick',
        label: 'Kick',
        filename: 'sounds/drums/acoustic-kit/kick',
        duration: 0.27
      }
    ];

    $scope.section = new Section($scope.bass, $scope.drums, {
      timeSignature: {
        top: 4,
        bottom: 4
      },
      length: 4
    });
    $scope.player.playbackRange.end = $scope.section.length + 1;

    // Reference for debugging
    window.section = $scope.section;

    $scope.slides = {
      bars: [],
      bass: [],
      drums: [],
      beatsPerSlide: 1,
      beatsPerView: 10,
      animationDuration: 300,
      swiperConfig: {}
    };
    // set initial swiper config
    $scope.slides.swiperConfig = {
      beatsPerView: $scope.slides.beatsPerView,
      beatsPerSlide: $scope.slides.beatsPerSlide,
      barBeatsCount: $scope.section.timeSignature.top,
      barsCount: $scope.section.length,
      firstSlide: 0,
      lastSlide: 0
    };


    function updateSlides() {
      var timeSignature = $scope.section.timeSignature;
      $scope.slides.bars = [];
      $scope.slides.bass = [];
      $scope.slides.drums = [];

      $scope.section.forEachBeat(function(beat) {
        var beatId = beat.bar+'_'+beat.index;
        beat.bass.id = beatId;
        beat.drums.id = beatId;
        $scope.slides.bass.push(beat.bass);
        $scope.slides.drums.push(beat.drums);
        $scope.slides.bars.push({
          id: beatId,
          bar: beat.bar,
          beat: beat.index,
          subbeats: beat.bass.subdivision === 3?
            [beat.index, 'trip', 'let'] :
            [beat.index, 'e', 'and', 'a']
        });
      });
    }

    function calculateVisibleSlides() {
      console.log('calculateVisibleSlides');
      // console.log($scope.slides.bass);
      var playbackRange = $scope.slides.swiperConfig.lastSlide - $scope.slides.swiperConfig.firstSlide + 1;

      var visibleIndexes = [];
      var length = $scope.barSwiper.activeIndex + $scope.slides.beatsPerView + $scope.slides.beatsPerSlide;
      var firstVisible = $scope.barSwiper.activeIndex - $scope.slides.beatsPerSlide;
      for (var i = firstVisible; i < length; i++) {
        var index = i >= playbackRange? i - playbackRange : i;
        index += $scope.slides.swiperConfig.firstSlide;
        if (index >= 0) {
          visibleIndexes.push(index);
        }
      }
      console.log('visible: '+visibleIndexes);
      for (var i = 0; i < $scope.slides.bass.length; i++) {
        var visible = visibleIndexes.indexOf(i) !== -1;
        $scope.slides.bass[i].visible = visible;
        $scope.slides.drums[i].visible = visible;

        $scope.slides.bass[i].initialized = visible || $scope.slides.bass[i].initialized;
      }
    }

    function updateSubbeatsVisibility() {
      console.log('updateSubbeatsVisibility');
      var slideWidth = $scope.barSwiper.size / $scope.slides.beatsPerView;
      // console.log(slideWidth);
      var visibleSubbeats;
      if (slideWidth > 240) {
        visibleSubbeats = [1, 2, 3, 4];
      } else if (slideWidth > 120) {
        visibleSubbeats = [1, 3];
      } else {
        visibleSubbeats = [1];
      }
      $scope.slides.bars.forEach(function(bar, index) {
        var bassBeat = $scope.slides.bass[index];
        if (bassBeat.subdivision === 3) {
          bar.visibleSubbeats = [1, 2, 3];
        } else {
          bar.visibleSubbeats = visibleSubbeats;
        }
        bassBeat.visibleSubbeats = bar.visibleSubbeats;
      });
      $scope.slides.visibleSubbeats = visibleSubbeats;
    }

    $scope.updatePlaybackRange = function() {
      audioPlayer.firstBar = $scope.player.playbackRange.start;
      audioPlayer.lastBar = $scope.player.playbackRange.end - 1;
      var firstBeat = (audioPlayer.firstBar - 1) * $scope.section.timeSignature.top;
      var lastBeat = (audioPlayer.lastBar) * $scope.section.timeSignature.top - 1;
      audioVisualiser.firstBeat = firstBeat;
      audioVisualiser.lastBeat = lastBeat;
      $scope.updateSwipers();
    }

    $scope.updateSwipers = function() {
      var reinitializeSlides = false;
      var updateSlidesSize = false;
      var swiperConfig = $scope.slides.swiperConfig;

      var firstBar = $scope.player.playbackRange.start;
      var lastBar = $scope.player.playbackRange.end - 1;
      var firstSlide = (firstBar - 1) * $scope.section.timeSignature.top;
      var lastSlide = lastBar * $scope.section.timeSignature.top - 1;

      if (firstSlide !== swiperConfig.firstSlide || lastSlide !== swiperConfig.lastSlide) {
        console.log('Swiper range changed: First Slide: {0} Last Slide: {1}'.format(firstSlide, lastSlide));
        swiperConfig.firstSlide = firstSlide;
        swiperConfig.lastSlide = lastSlide;
        for (var i = 0; i < $scope.slides.bars.length; i++) {
          var display = (i < firstSlide || i > lastSlide)? 'none' : '';
          $scope.barSwiper.wrapper[0].children[i].style.display = display;
          $scope.bassSwiper.wrapper[0].children[i].style.display = display;
          $scope.drumsSwiper.wrapper[0].children[i].style.display = display;
        }

        updateSlidesSize = true;
        // $scope.barSwiper.update();
        // $scope.bassSwiper.update();
        // $scope.drumsSwiper.update();
        var Dom7 = $scope.barSwiper.$;
        Dom7($scope.barSwiper.wrapper[0].querySelector('.bar-end')).removeClass('bar-end');
        Dom7($scope.barSwiper.slides[lastSlide]).addClass('bar-end');
      }
      if ($scope.section.length !== swiperConfig.barsCount) {
        if ($scope.section.length > 0 && $scope.section.length <= 24) {
          $scope.section.setLength($scope.section.length);
          console.log('* barsCount changed');
          swiperConfig.barsCount = $scope.section.length;
          $scope.section.setLength($scope.section.length);
          reinitializeSlides = true;
        } else {
          $scope.section.length = swiperConfig.barsCount;
        }
      }
      if ($scope.section.timeSignature.top !== swiperConfig.barBeatsCount) {
        if ($scope.section.timeSignature.top > 1 && $scope.section.timeSignature.top < 13) {
          console.log('* barBeatsCount changed');
          swiperConfig.barBeatsCount = $scope.section.timeSignature.top;
          reinitializeSlides = true;
        } else {
          $scope.section.timeSignature.top = swiperConfig.barBeatsCount;
        }
      }

      // restrict beats per view to meaningful values
      // var allSlidesCount = $scope.section.timeSignature.top * $scope.section.length;
      var allSlidesCount = lastSlide - firstSlide + 1;
      var maxSlidesPerView = Math.min(allSlidesCount, 16);
      if ($scope.slides.beatsPerView > maxSlidesPerView) {
        $scope.slides.beatsPerView = maxSlidesPerView;
      }
      if ($scope.slides.beatsPerView < 1) {
        $scope.slides.beatsPerView = 1;
      }
      if ($scope.slides.beatsPerView === allSlidesCount) {
        $scope.barSwiper.slideReset();
        $scope.bassSwiper.slideReset();
        $scope.drumsSwiper.slideReset();
        $scope.barSwiper.lockSwipes();
      } else {
        $scope.barSwiper.unlockSwipes();
      }

      if ($scope.slides.beatsPerView !== swiperConfig.beatsPerView) {
        console.log('* beatsPerView changed');
        swiperConfig.beatsPerView = $scope.slides.beatsPerView;
        $scope.barSwiper.params.slidesPerView = $scope.slides.beatsPerView;
        $scope.bassSwiper.params.slidesPerView = $scope.slides.beatsPerView;
        $scope.drumsSwiper.params.slidesPerView = $scope.slides.beatsPerView;
        updateSlidesSize = true;
      }
      if ($scope.slides.beatsPerSlide !== swiperConfig.beatsPerSlide) {
        console.log('* beatsPerSlide changed');
        swiperConfig.beatsPerSlide = $scope.slides.beatsPerSlide;
        $scope.barSwiper.params.slidesPerGroup = $scope.slides.beatsPerSlide;
        $scope.bassSwiper.params.slidesPerGroup = $scope.slides.beatsPerSlide;
        $scope.drumsSwiper.params.slidesPerGroup = $scope.slides.beatsPerSlide;
        updateSlidesSize = true;
      }

      if (reinitializeSlides) {
        updateSlides();
        // no need to update slides size after re-initialization
        updateSlidesSize = false;
        $timeout(function() {
          $scope.barSwiper.init();
          $scope.bassSwiper.init();
          $scope.drumsSwiper.init();
          calculateVisibleSlides();
          updateSubbeatsVisibility();
        });
      }
      if (updateSlidesSize) {
        $scope.barSwiper.update();
        $scope.bassSwiper.updateSlidesSize();
        $scope.drumsSwiper.updateSlidesSize();
        // barSwiper.updateClasses() doesn't work as expected (prev/next
        // button state), so use barSwiper.update() instead.
        // $scope.barSwiper.updatePagination();
        // $scope.barSwiper.updateClasses();

        calculateVisibleSlides();
        updateSubbeatsVisibility();
        audioVisualiser.updateSize();

        if ($scope.barSwiper.activeIndex > lastSlide) {
          console.log(' WRONG INDEX ');
        }
        if ($scope.barSwiper.getWrapperTranslate() < $scope.barSwiper.maxTranslate()) {
          // fix slides when scrolled to much
          console.log('Fix slide something ...');
          $scope.barSwiper.slideTo($scope.barSwiper.activeIndex, 0, true);
        }
      }
    };

    $scope.setBeatSubdivision = function(barBeat, bassBeat, subdivision) {
      console.log(barBeat);
      console.log(bassBeat);
      bassBeat.subdivision = subdivision;
      if (subdivision === 3) {
        barBeat.subbeats.splice(1, barBeat.subbeats.length-1, 'trip', 'let');
        barBeat.visibleSubbeats = [1, 2, 3];
        bassBeat.visibleSubbeats = [1, 2, 3];
      } else {
        barBeat.subbeats.splice(1, barBeat.subbeats.length-1, 'e', 'and', 'a');
        updateSubbeatsVisibility();
      }
    };

    $scope.renderingBar = function(index) {
      console.log('Rendering Bar: '+index);
    };


    function rebuildSwiper(swiper, containerClass) {
      swiper.detachEvents();
      var config = ['slidesPerGroup', 'slidesPerView', 'spaceBetween', 'roundLengths', 'showNavButtons', 'loop', 'paginationClickable', 'pagination', 'watchSlidesVisibility'];
      var params = {};
      for (var i = 0; i < config.length; i++) {
        var attr = config[i];
        params[attr] = swiper.params[attr];
      }
      params.initialSlide = swiper.activeIndex;
      swiper.onTransitionEnd = function() {
        console.log('|||| ERROR ERROR ||||');
      }
      swiper.destroy();
      return new Swiper(containerClass, params);
    }

    function createLoop(swiper, containerClass) {
      var normalSlidesCount = swiper.slides.length;
      var playbackSlidesCount = audioVisualiser.lastBeat - audioVisualiser.firstBeat + 1;

      console.log('create loop from: '+normalSlidesCount+' slides');
      var onTheirPlace = [];
      for (var i = 0; i < normalSlidesCount; i++) {
        onTheirPlace[i] = true;
      }

      for (var i = 0; i <= $scope.slides.beatsPerView; i++) {
        var slide = angular.element('<div class="swiper-slide"></div>');
        slide.addClass(swiper.params.slideDuplicateClass);
        swiper.appendSlide(slide[0]);
        onTheirPlace.push(false);
      }

      /* With swiper re-creation */
      // var activeSlide = swiper.activeIndex;
      // var params = angular.copy(swiper.params);
      // delete params.control;
      // params.initialSlide = activeSlide;
      swiper = rebuildSwiper(swiper, containerClass);

      swiper._loopCallback = function(s) {
        console.log('Range: {0} - {1} Active index: {2} Loop start: {3}'.format(audioVisualiser.firstBeat, audioVisualiser.lastBeat, s.activeIndex, s._loopStartIndex));
        if (s.activeIndex >= playbackSlidesCount) {
          var index = s.activeIndex-playbackSlidesCount;
          console.log('LAST SLIDE, going to: '+index);
          s.slideTo(index, 0, false, true);
        }

        var lastViewIndex = s.activeIndex + $scope.slides.beatsPerView + $scope.slides.beatsPerSlide;

        var length = Math.min($scope.slides.beatsPerView+$scope.slides.beatsPerSlide, playbackSlidesCount);
        length = $scope.slides.beatsPerView+$scope.slides.beatsPerSlide;
        for (var i = 0; i < length; i++) {
          var j = audioVisualiser.firstBeat + i + s.activeIndex;
          if (j > audioVisualiser.lastBeat) {
            // skip slides outside playback range
            j += normalSlidesCount - audioVisualiser.lastBeat - 1;
          }
          // console.log(j+': '+onTheirPlace[j]);
          if (!onTheirPlace[j]) {
            var otherPlaceIndex = (j < normalSlidesCount)?
              j + normalSlidesCount - audioVisualiser.firstBeat :
              j - (normalSlidesCount - audioVisualiser.firstBeat);

            // console.log('move required: '+j+' <--> '+otherPlaceIndex);
            var elem = s.slides[otherPlaceIndex];
            var destSlideElem = s.slides[j];
            var dummyClones = [];
            // console.log('orig display: '+elem.style.display);
            s.$(destSlideElem).removeClass('swiper-slide-duplicate');
            while (destSlideElem.lastChild) {
              destSlideElem.removeChild(destSlideElem.lastChild);
            }
            for (var ch = elem.childElementCount-1; ch >= 0; ch--) {
              dummyClones.push(elem.children[0].cloneNode(true));
              destSlideElem.appendChild(elem.children[0]);
            }
            for (var ch = 0; ch < dummyClones.length; ch++) {
              elem.appendChild(dummyClones[ch]);
            }
            onTheirPlace[j] = true;
            onTheirPlace[otherPlaceIndex] = false;
            destSlideElem.className = elem.className;
            s.$(elem).addClass('swiper-slide-duplicate');
          }
        }
      };
      swiper.on('transitionEnd', swiper._loopCallback);
      swiper._onTheirPlace = onTheirPlace;
      swiper._loopStartIndex = normalSlidesCount;
      swiper._loopEndIndex = swiper.slides.length - 1;

      swiper._loopCallback(swiper);
      return swiper;
    }


    function destroyLoop(swiper, containerClass) {
      var normalSlidesCount = $scope.slides.bars.length;
      var cloneIndexes = [];
      swiper.off('transitionEnd', swiper._loopCallback);
      swiper.detachEvents();
      console.log($scope.slides.bars.length+' vs '+swiper.slides.length);
      for (var j = $scope.slides.bars.length; j < swiper.slides.length; j++) {
        cloneIndexes.push(j);
        if (swiper._onTheirPlace[j]) {
          var origPlaceIndex = j % normalSlidesCount;
          var elem = swiper.slides[j];
          console.log('returning back '+j+' --> '+origPlaceIndex);
          var destSlideElem = swiper.slides[origPlaceIndex];
          while (destSlideElem.lastChild) {
            destSlideElem.removeChild(destSlideElem.lastChild);
          }
          for (var ch = elem.childElementCount-1; ch >= 0; ch--) {
            destSlideElem.appendChild(elem.children[0]);
          }
          destSlideElem.className = elem.className;
        }
      }
      swiper.removeSlide(cloneIndexes);

      return rebuildSwiper(swiper, containerClass);
    }

    $scope.onBarSwiper = function(swiper) {
      console.log('Bar');
      console.log(swiper);
      $scope.barSwiper = swiper;
      $scope.barSwiper.on('transitionEnd', calculateVisibleSlides);

    };
    $scope.onBassSwiper = function(swiper) {
      console.log('Bass');
      console.log(swiper);
      $scope.bassSwiper = swiper;
      $scope.barSwiper.params.control = [swiper];
      // createLoop(swiper);
    };
    $scope.onDrumsSwiper = function(swiper) {
      console.log('Drums');
      console.log(swiper);
      $scope.drumsSwiper = swiper;
      $scope.barSwiper.params.control = [$scope.bassSwiper, $scope.drumsSwiper];
      $scope.updatePlaybackRange();
      $scope.updateSwipers();
      calculateVisibleSlides();
      updateSubbeatsVisibility();
      $scope.barSwiper.updatePagination();
      // timeline = new Timeline(context, $scope.barSwiper, $scope.drumsSwiper);
      timeline = new HighlightTimeline($scope.slides);
    };

    updateSlides();

    $scope.$watch('player.bpm', function(value) {
      audioPlayer.setBpm($scope.player.bpm);
    });


    function beatPrepared(evt) {
      if (evt.playbackActive) {
        var slide = evt.flatIndex - audioVisualiser.firstBeat;
        if (slide < $scope.barSwiper.activeIndex) {
          // compute index of 'cloned' looped slide
          slide = audioVisualiser.lastBeat - audioVisualiser.firstBeat + 1 + slide;
          console.log('next round: '+slide);
        }
        console.log('slide to '+slide);
        $scope.barSwiper.slideTo(
          slide,
          (slide === 0)? 0 : $scope.slides.animationDuration,
          true
        );
      }

      if ($scope.player.graphEnabled) {
        audioVisualiser.beatSync(evt);
      }
      timeline.beatSync(evt);
    }

    var repeats;
    var timeline;
    $scope.play = function() {
      audioPlayer.drums.audio.connect(context.destination);
      audioPlayer.bass.audio.connect(context.destination);

      if ($scope.player.loop) {
        var playbackRange = audioVisualiser.lastBeat-audioVisualiser.firstBeat + 1;
        if (playbackRange > $scope.slides.beatsPerView) {
          $scope.barSwiper.off('transitionEnd', calculateVisibleSlides);
          $scope.barSwiper = createLoop($scope.barSwiper, '.bar-swiper .swiper-container');
          $scope.bassSwiper = createLoop($scope.bassSwiper, '.bass-swiper .swiper-container');
          $scope.drumsSwiper = createLoop($scope.drumsSwiper, '.drums-swiper .swiper-container');

          $scope.barSwiper.params.control = [$scope.bassSwiper, $scope.drumsSwiper];
          $scope.barSwiper.on('transitionEnd', calculateVisibleSlides)
        };

        // createLoop($scope.drumsSwiper);
      }
      // go to start as soon as possible
      if ($scope.barSwiper.activeIndex > 0) {
        $scope.barSwiper.slideTo(0, 0, true);
      }

      //return audioPlayer.composer.test();

      $scope.player.playing = true;
      audioPlayer.setBpm($scope.player.bpm);
      if ($scope.player.graphEnabled) {
        audioVisualiser.setBeatsCount($scope.slides.bars.length);
        audioVisualiser.activate();
      }
      audioPlayer.countdown = $scope.player.countdown;
      timeline.start();
      repeats = 1;
      audioPlayer.play($scope.section, beatPrepared, $scope.player.loop? -1 : 1);
    };

    $scope.stop = function() {
      audioPlayer.stop();
    };

    audioPlayer.on('playbackStopped', function() {
      $scope.player.playing = false;
      audioVisualiser.deactivate();
      timeline.stop();

      if ($scope.player.loop) {
        var playbackRange = audioVisualiser.lastBeat-audioVisualiser.firstBeat + 1;
        if (playbackRange > $scope.slides.beatsPerView) {
          $scope.barSwiper.off('transitionEnd', calculateVisibleSlides);
          $scope.barSwiper = destroyLoop($scope.barSwiper, '.bar-swiper .swiper-container');
          $scope.bassSwiper = destroyLoop($scope.bassSwiper, '.bass-swiper .swiper-container');
          $scope.drumsSwiper = destroyLoop($scope.drumsSwiper, '.drums-swiper .swiper-container');

          $scope.barSwiper.params.control = [$scope.bassSwiper, $scope.drumsSwiper];
          $scope.barSwiper.on('transitionEnd', calculateVisibleSlides);
          calculateVisibleSlides();
        }
      }
    });

    $scope.toggleVolumeMute = function(instrument) {
      if (!instrument.muted) {
        instrument._volume = instrument.audio.gain.value;
        // zero gain value would cause invalid drawing of audio signal
        instrument.audio.gain.value = 0.0001;
      } else {
        instrument.audio.gain.value = instrument._volume || instrument.audio.gain.value;
      }
      instrument.muted = !instrument.muted;
    };

    $scope.toggleInputMute = function(input) {
      $scope.toggleVolumeMute(input);
      if (input.muted) {
        console.log('mute microphone');
        // input.stream.removeTrack(input.stream.getAudioTracks()[0]);
        // input.source.disconnect();
        audioVisualiser.initialize(context, audioPlayer.bass.audio);
      } else {
        if (!input.source) {
          var gotStream = function(stream) {
            input.stream = stream;
            // Create an AudioNode from the stream.
            input.source = context.createMediaStreamSource(stream);
            input.source.connect(input.audio);
            audioVisualiser.initialize(context, input.audio);
            input.audio.connect(context.destination);
          }

          var error = function() {
            alert('Stream generation failed.');
          }

          navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;
          navigator.getUserMedia({ audio: true }, gotStream, error);
        } else {
          // input.source.connect(input.audio);
          // audioVisualiser.setInputSource(context, input.audio);
        }
      }
    };

    $scope.playDrumSound = function(drum) {
      audioPlayer.playDrumSample({
        drum: drum,
        volume: 0.75
      });
    };

    // Prevent default context menu
    window.oncontextmenu = function() {
      return false;
    }
  }
})();
