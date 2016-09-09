(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('AppController', AppController)
    .value('context', new AudioContext())
    .value('workspace', {})
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

  function AppController($scope, $timeout, context, workspace, audioPlayer, audioVisualiser, projectManager,
                         Bass, Drums, Section, BassSection, Timeline, HighlightTimeline, swiperControl) {
    audioVisualiser.initialize(context, audioPlayer.bass.audio);
    audioPlayer.drums.audio.connect(context.destination);
    audioPlayer.bass.audio.connect(context.destination);

    $scope.ui = {instrumentIndex: 0};
    $scope.player = {
      playing: false,
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

    $scope.bass = {
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
        label: 'name-and-fret',
        colors: true
      }
    };

    $scope.project = projectManager.createProject([
      {
        type: 'bass',
        name: 'Bassline',
        strings: 'EADG',
        tuning: [0, 0, 0, 0]
      }, {
        type: 'bass',
        name: 'Melody',
        strings: 'EADG',
        tuning: [0, 0, 0, 0]
      }, {
        type: 'drums',
        kit: 'Standard',
        name: 'Standard'
      }, {
        type: 'drums',
        kit: 'Bongo',
        name: 'Bongo'
      }
    ]);

    $scope.section = projectManager.createSection({
      timeSignature: {
        top: 4,
        bottom: 4
      },
      bpm: 80,
      length: 3,
      beatsPerSlide: 1,
      beatsPerView: 10,
      animationDuration: 300
    });

    angular.extend(workspace, {
      selectedSectionIndex: -1,
      section: $scope.section,
      data: null
    });
    $scope.workspace = workspace;

    $scope.swiperControl = swiperControl;
    $scope.slides = [];

    $scope.barLabels = {
      3: ['trip', 'let'],
      4: ['e', 'and', 'a']
    };


    $scope.player.playbackRange.end = $scope.section.length + 1;

    $scope.updatePlaybackRange = function() {
      audioPlayer.firstBar = $scope.player.playbackRange.start;
      audioPlayer.lastBar = $scope.player.playbackRange.end - 1;
      var firstBeat = (audioPlayer.firstBar - 1) * $scope.section.timeSignature.top;
      var lastBeat = (audioPlayer.lastBar) * $scope.section.timeSignature.top - 1;
      audioVisualiser.firstBeat = firstBeat;
      audioVisualiser.lastBeat = lastBeat;

      swiperControl.setVisibleRange(firstBeat, lastBeat);
    }


    $scope.renderingBar = function(index) {
      console.log('Rendering Bar: '+index);
    };


    timeline = new HighlightTimeline(swiperControl);

    $scope.bpmChanged = function(value) {
      console.log('bpm changed: '+value);
      audioPlayer.setBpm($scope.section.bpm);
    };

    function beatPrepared(evt) {
      if (evt.playbackActive) {
        var slide = evt.flatIndex - swiperControl.firstSlide;
        // console.log('flatIndex: '+evt.flatIndex+' slide: '+slide);
        // console.log('active index: '+swiperControl.barSwiper.activeIndex);
        if (slide < swiperControl.barSwiper.activeIndex) {
          // compute index of 'cloned' looped slide
          slide = swiperControl.lastSlide - swiperControl.firstSlide + 1 + slide;
        }
        // console.log('slide to '+slide);

        var timeToBeat = evt.startTime - evt.eventTime;
        // console.log(slide-$scope.barSwiper.activeIndex);
        // console.log(timeToBeat);
        //setTimeout(function() {
          swiperControl.barSwiper.slideTo(
            slide,
            (slide === 0)? 0 : $scope.section.animationDuration,
            true
          );
        //}, parseInt(timeToBeat*1000)-50);
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
        if (playbackRange > $scope.section.beatsPerView) {
          swiperControl.createLoop();
        }
      }
      // go to start as soon as possible
      if (swiperControl.barSwiper.activeIndex > 0) {
        swiperControl.barSwiper.slideTo(0, 0, true);
      }

      //return audioPlayer.composer.test();

      $scope.player.playing = true;
      audioPlayer.setBpm($scope.section.bpm);
      if ($scope.player.graphEnabled) {
        audioVisualiser.setBeatsCount($scope.slides.length);
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

      // TODO: check if loop slides was created properly, this is not reliable
      if ($scope.player.loop) {
        var playbackRange = audioVisualiser.lastBeat-audioVisualiser.firstBeat + 1;
        if (playbackRange > $scope.section.beatsPerView) {
          swiperControl.destroyLoop();
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
        volume: 0.85
      });
    };


    function createSlides() {
      var timeSignature = $scope.section.timeSignature;

      $scope.slides = [];
      workspace.trackSection.forEachBeat(function(beat) {
        var slideId = beat.bar+'_'+beat.index;
        $scope.slides.push({
          id: slideId,
          beat: beat.beat,
          type: $scope.ui.instrumentIndex
        });
      });
    }

    $scope.initializeWorkspace = function(track) {
      $scope.workspace.track = track;
      console.log(track);
      $scope.workspace.trackSection = workspace.section.tracks[track.id];
      // $scope.project.bass = track.instrument;
      createSlides();
    };

    $scope.initializeWorkspace(projectManager.project.tracks.find(function(track) {return track.type === 'bass'}));

    $timeout(function() {
      swiperControl.setSlides($scope.slides, {
        slidesPerView: $scope.section.beatsPerView,
        slidesPerGroup: $scope.section.beatsPerSlide
      });
      $scope.updatePlaybackRange();
    });

    function clearSectionWorkspace() {
      audioVisualiser.clear();
      $scope.section.forEachTrack(function(trackSection) {
        trackSection.forEachBeat(function(beat) {
          trackSection.clearBeat(beat.beat);
        });
      });
    };

    function sectionLoaded(section) {
      clearSectionWorkspace();
      $scope.section = section;
      $scope.player.playbackRange.start = 1;
      $scope.player.playbackRange.end = section.length + 1;
      $scope.updatePlaybackRange();

      console.log('sectionLoaded');
      $scope.initializeWorkspace(projectManager.project.tracks.find(function(track) {return track.type === 'bass'}));
      createSlides();
      $timeout(function() {
        swiperControl.setSlides($scope.slides, {
          slidesPerView: $scope.section.beatsPerView,
          slidesPerGroup: $scope.section.beatsPerSlide
        });
      });

      $timeout(function () {
        $scope.$broadcast('rzSliderForceRender');
      });
    }

    projectManager.on('sectionCreated', clearSectionWorkspace);
    projectManager.on('sectionDeleted', clearSectionWorkspace);
    projectManager.on('sectionLoaded', sectionLoaded);

    $scope.setStringsLayout = function(strings) {
      console.log(strings);
      var bassSlides = $scope.slides.bass;
      $scope.slides.bass = [];
      $scope.bass.initStrings(strings);

      // $scope.section.forEachBassSubbeat(function(subbeat) {
      //   subbeat.data['B'] = {
      //     sound: {}
      //   };
      // });

      $timeout(function() {
        updateSlides();
        // updateSlides will delete 'visibleSubbeats' attribute from beats
        updateSubbeatsVisibility();
        $timeout(function() {
          $scope.bassSwiper.update();
        }, 10);
      }, 10)
    };

    var lastInstrumentTrackSelection = {};

    $scope.selectInstrument = function(index) {
      console.log('--- selectInstrument ----');
      console.log(lastInstrumentTrackSelection[index]);
      var trackId;
      switch (index) {
        case 0:
          trackId = lastInstrumentTrackSelection[index] || 'bass_0';
          break;
        case 1:
          trackId = lastInstrumentTrackSelection[index] || 'drums_0';
          break;
      }
      console.log(workspace.section.tracks[trackId]);
      var track = projectManager.project.tracks.find(function(t){return t.id === trackId});
      $scope.selectTrack(track);

      swiperControl.switchInstrument(index);
      $scope.ui.instrumentIndex = index;
    };

    $scope.selectTrack = function(track) {
      console.log('--- selectTrack: '+track.id);
      var instrumentIndex = track.type === 'bass'? 0 : 1;
      lastInstrumentTrackSelection[instrumentIndex] = track.id;

      workspace.trackSection = workspace.section.tracks[track.id];
      workspace.track = track;
      if ($scope.ui.instrumentIndex !== instrumentIndex) {
        swiperControl.switchInstrument(instrumentIndex);
        $scope.ui.instrumentIndex = instrumentIndex;
      } else {
        $scope.slides.forEach(function(slide) {
          slide.type = -1;
        });
        $scope.ui.instrumentIndex = instrumentIndex;
        $timeout(function() {
          swiperControl.switchInstrument(instrumentIndex);
        });
        /*
        $scope.slides.forEach(function(slide) {
          var trackBeat = workspace.trackSection.beat(slide.beat.bar, slide.beat.beat);
          slide.beat = trackBeat;
        });
        */
      }
    };

    $scope.selectTrack(projectManager.project.tracks.find(function(track) {return track.type === 'bass'}));

    // Load standard drums kit sounds
    var resources = Drums.Standard.map(function(drum) {
      return drum.filename;
    });
    audioPlayer.bufferLoader.loadResources(resources);

    window.workspace = workspace;

    // Prevent default context menu
    window.oncontextmenu = function() {
      return false;
    }
  }
})();
