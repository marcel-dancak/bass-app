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

  function AppController($scope, $timeout, context, audioPlayer, audioVisualiser, Notes, Section) {
    audioPlayer.drums.audio.connect(context.destination);
    audioVisualiser.initialize(context, audioPlayer);

    $scope.player = {
      playing: false,
      bpm: 80,
      bass: audioPlayer.bass,
      drums: audioPlayer.drums,
      input: audioPlayer.input
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
      strings: [
        {
          label: 'E',
          octave: 1,
          index: 0,
          noteIndex: bassNotes.list.indexOf(bassNotes.map['E1'])
        }, {
          label: 'A',
          octave: 1,
          index: 1,
          noteIndex: bassNotes.list.indexOf(bassNotes.map['A1'])
        }, {
          label: 'D',
          octave: 2,
          index: 2,
          noteIndex: bassNotes.list.indexOf(bassNotes.map['D2'])
        }, {
          label: 'G',
          octave: 2,
          index: 3,
          noteIndex: bassNotes.list.indexOf(bassNotes.map['G2'])
        }
      ],
      playingStyles: {
        finger: {
          name: 'finger',
          label: 'Finger'
        },
        slap: {
          name: 'slap',
          label: 'Slap'
        },
        pop: {
          name: 'pop',
          label: 'Pop'
        },
        tap: {
          name: 'tap',
          label: 'Tap'
        },
        hammer: {
          name: 'hammer-on',
          label: 'Hammer on'
        },
        pull: {
          name: 'pull-off',
          label: 'Pull off'
        }
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
      length: 2
    });
    // Reference for debugging
    window.section = $scope.section;

    $scope.slides = {
      bars: [],
      bass: [],
      drums: [],
      beatsPerSlide: 2,
      beatsPerView: 10,
      animationDuration: 300,
      swiperConfig: {}
    };
    // set initial swiper config
    $scope.slides.swiperConfig = {
      beatsPerView: $scope.slides.beatsPerView,
      beatsPerSlide: $scope.slides.beatsPerSlide,
      barBeatsCount: $scope.section.timeSignature.top,
      barsCount: $scope.section.length
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

    function updateSubbeatsVisibility() {
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

    $scope.updateSwipers = function(options) {
      var reinitializeSlides = false;
      var updateSlidesSize = false;

      var swiperConfig = $scope.slides.swiperConfig;
      if ($scope.section.length !== swiperConfig.barsCount) {
        if ($scope.section.length > 0 && $scope.section.length < 20) {
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
      var allSlidesCount = $scope.section.timeSignature.top * $scope.section.length;
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
          updateSubbeatsVisibility();
        });
      }
      if (updateSlidesSize) {
        $scope.barSwiper.updateSlidesSize();
        $scope.bassSwiper.updateSlidesSize();
        $scope.drumsSwiper.updateSlidesSize();
        updateSubbeatsVisibility();
        audioVisualiser.redraw();

        if ($scope.barSwiper.getWrapperTranslate() < $scope.barSwiper.maxTranslate()) {
          // fix slides when scrolled to much
          $scope.barSwiper.slideTo($scope.barSwiper.activeIndex, 0, false);
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

    $scope.onBarSwiper = function(swiper) {
      console.log('Bar');
      console.log(swiper);
      $scope.barSwiper = swiper;
    };
    $scope.onBassSwiper = function(swiper) {
      console.log('Bass');
      console.log(swiper);
      $scope.bassSwiper = swiper;
      $scope.barSwiper.params.control = [swiper];
    };
    $scope.onDrumsSwiper = function(swiper) {
      console.log('Drums');
      console.log(swiper);
      $scope.drumsSwiper = swiper;
      $scope.barSwiper.params.control.push(swiper);
      $scope.updateSwipers();
    };

    updateSlides();

    $scope.$watch('player.bpm', function(value) {
      audioPlayer.setBpm($scope.player.bpm);
    });

    var timelineElem = document.getElementById('time-marker');
    timelineElem.style.visibility = "hidden";
    function timelineRedraw() {
      if ($scope.barSlideElement) {
        var elapsed = context.currentTime - $scope.barSlideStartTime;
        var beatTime = 60 / $scope.player.bpm;
        var fraction = elapsed / beatTime;

        var barBox = $scope.barSlideElement.getBoundingClientRect();
        if ($scope.player.playing) {
          timelineElem.style.left = barBox.left+fraction*barBox.width+'px';
          requestAnimationFrame(timelineRedraw);
        } else {
          timelineElem.style.left = 0;
          timelineElem.style.visibility = "hidden";
        }
      }
    }
    function beatSync(barIndex, beat, bpm) {
      audioVisualiser.beatSync(barIndex, beat, bpm);
      var slide = (barIndex-1)*$scope.section.timeSignature.top+beat-1;
      $scope.barSwiper.slideTo(
        slide,
        (slide === 0)? 0 : $scope.slides.animationDuration,
        false
      );
      var barSlideElement = $scope.barSwiper.$('.swiper-slide')[slide];
      $scope.barSlideStartTime = context.currentTime;
      if (!$scope.barSlideElement) {
        $scope.barSlideElement = barSlideElement;
        timelineRedraw();
      } else {
        $scope.barSlideElement = barSlideElement;
      }
    }

    $scope.play = function() {
      $scope.player.playing = true;
      audioPlayer.setBpm($scope.player.bpm);
      audioVisualiser.activate();
      audioVisualiser.setBeatsCount($scope.slides.bars.length);
      $scope.barSlideElement = null;
      var barTop = $scope.barSwiper.wrapper.offset().top;
      var instrumentTop = $scope.drumsSwiper.wrapper.offset().top;
      var height = instrumentTop-barTop+$scope.drumsSwiper.wrapper.height();

      timelineElem.style.top = parseInt(barTop)+'px';
      timelineElem.style.height = parseInt(height)+'px';

      timelineElem.style.visibility = "visible";
      audioPlayer.play(
        $scope.section,
        beatSync
      );
    };

    $scope.stop = function() {
      $scope.player.playing = false;
      audioPlayer.stop();
      audioVisualiser.deactivate();
      timeline.stop();
    };

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
      } else {
        if (!input.source) {
          var gotStream = function(stream) {
            input.stream = stream;
            // Create an AudioNode from the stream.
            input.source = context.createMediaStreamSource(stream);
            input.source.connect(input.audio);
            audioVisualiser.setInputSource(context, input.audio);
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

    $scope.playBassSound = function(bassSound) {
      var sound = angular.extend({
        style: 'finger',
        noteLength: {
          beatLength: 1/2
        },
        volume: 0.75
      }, bassSound);
      audioPlayer.playBassSample(sound);
    };

    $scope.playDrumSound = function(drum) {
      audioPlayer.playDrumSample({
        drum: drum,
        volume: 0.75
      });
    };

    $scope.clearSection = function() {
      audioVisualiser.clear();
      $scope.section.forEachBeat(function(beat) {
        $scope.section.clearBassBeat(beat.bass);
        $scope.section.clearDrumsBeat(beat.drums);
      });
    };

    $scope.deleteSection = function(index) {
      if (index !== -1) {
        var storageKey = 'v8.section.'+$scope.project.sections[index];
        localStorage.removeItem(storageKey);
        $scope.project.sections.splice(index, 1);
      }
      $scope.project.selectedSectionIndex = -1;
      $scope.project.sectionName = '';
      $scope.clearSection();
    };

    $scope.saveSection = function(index, name) {
      if (!name) {
        return;
      }
      var section = $scope.section;
      console.log('saving: '+name);
      if ($scope.project.sections[index]) {
        // If section was renamed, delete old record
        if ($scope.project.sections[index] !== name) {
          var oldKey = 'v8.section.'+$scope.project.sections[index];
          // console.log('Old key: '+oldKey);
          localStorage.removeItem(oldKey);
          $scope.project.sections[index] = name;
        }
      } else {
        // save as new record
        $scope.project.sections.push(name);
        $scope.project.selectedSectionIndex = $scope.project.sections.length-1;
      }

      var storageKey = 'v8.section.'+name;
      console.log(storageKey);
      var sectionStorageBeats = [];

      section.forEachBeat(function(beat) {
        sectionStorageBeats.push({
          bar: beat.bar,
          beat: beat.index,
          bass: {
            subdivision: beat.bass.subdivision,
            sounds: section.getBassSounds(beat.bass)
          },
          drums: {
            subdivision: beat.drums.subdivision,
            sounds: section.getDrumsSounds(beat.drums)
          }
        });
      });

      var data = {
        timeSignature: section.timeSignature,
        length: section.length,
        beats: sectionStorageBeats,
        // other section configuration
        beatsPerView: $scope.slides.beatsPerView,
        beatsPerSlide: $scope.slides.beatsPerSlide,
        animationDuration: $scope.slides.animationDuration
      }
      console.log(JSON.stringify(data));
      localStorage.setItem(storageKey, JSON.stringify(data));
    };

    $scope.loadSection = function(index) {
      var sectionName = $scope.project.sections[index];
      if (!sectionName) {
        return;
      }
      $scope.project.sectionName = sectionName;
      var storageKey = 'v8.section.'+sectionName;
      var sectionData = JSON.parse(localStorage.getItem(storageKey));
      console.log(sectionData);
      if (sectionData.animationDuration) {
        $scope.section.animationDuration = sectionData.animationDuration;
      }
      var sectionConfigChanged = $scope.section.timeSignature.top !== sectionData.timeSignature.top;

      $scope.section.setLength(sectionData.length);
      $scope.section.timeSignature = sectionData.timeSignature;
      $scope.slides.beatsPerView = sectionData.beatsPerView;
      $scope.slides.beatsPerSlide = sectionData.beatsPerSlide;
      $scope.updateSwipers();

      $scope.clearSection();

      // override selected section data
      sectionData.beats.forEach(function(beat) {
        if (beat.bass) {
          var destBassBeat = section.bassBeat(beat.bar, beat.beat);
          if (beat.bass.subdivision !== destBassBeat.subdivision) {
            var flatIndex = (beat.bar-1)*section.timeSignature.top+beat.beat-1;
            var barBeat = $scope.slides.bars[flatIndex];
            $scope.setBeatSubdivision(barBeat, destBassBeat, beat.bass.subdivision);
          }
          beat.bass.sounds.forEach(function(bassSound) {
            var subbeat = $scope.section.bassSubbeat(beat.bar, beat.beat, bassSound.subbeat);
            angular.extend(subbeat[bassSound.sound.string].sound, bassSound.sound);
          });
        }
        beat.drums.sounds.forEach(function(drumSound) {
          var subbeat = $scope.section.drumsSubbeat(beat.bar, beat.beat, drumSound.subbeat);
          subbeat[drumSound.drum].volume = drumSound.volume;
        });
      });
    }

    function loadSavedSectionsNames() {
      var storageKeyPrefix = 'v8.section.';
      var sectionsNames = [];
      var i;
      for (i=0; i<localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key.startsWith(storageKeyPrefix)) {
          sectionsNames.push(key.substring(storageKeyPrefix.length));
        }
      }
      return sectionsNames;
    }

    $scope.project = {
      sections: loadSavedSectionsNames(),
      selectedSectionIndex: null
    };

    // Prevent default context menu
    window.oncontextmenu = function() {
      return false;
    }
  }
})();
