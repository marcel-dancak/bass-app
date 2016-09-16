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

  function AppController($scope, $timeout, context, workspace, audioPlayer, audioVisualiser, projectManager, Drums,
                         BassSection, DrumSection, BassTrackSection, DrumTrackSection, HighlightTimeline, swiperControl) {
    // audioVisualiser.initialize(context, audioPlayer.bass.audio);

    $scope.ui = {instrumentIndex: 0};
    $scope.player = {
      playing: false,
      input: audioPlayer.input,
      countdown: false,
      loop: true,
      playbackRange: {
        start: 1,
        end: 1
      },
      graphEnabled: false,
      visibleBeatsOnly: false
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
        strings: 'BEADG',
        tuning: [0, 0, 0, 0, 0]
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
      var firstBar = $scope.player.playbackRange.start;
      var lastBar = $scope.player.playbackRange.end - 1;
      audioPlayer.playbackRange = {
        start: {
          bar: firstBar,
          beat: 1
        },
        end: {
          bar: lastBar,
          beat: workspace.section.timeSignature.top
        }
      };
      var firstBeat = (firstBar - 1) * $scope.section.timeSignature.top;
      var lastBeat = (lastBar) * $scope.section.timeSignature.top - 1;
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
      if (evt.playbackActive && !$scope.player.visibleBeatsOnly) {
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
      if ($scope.player.visibleBeatsOnly) {
        var sFlatIndex = swiperControl.firstSlide + swiperControl.barSwiper.activeIndex;
        var eFlatIndex = sFlatIndex + workspace.section.beatsPerView - 1;
        audioPlayer.playbackRange = {
          start: {
            bar: parseInt(sFlatIndex / workspace.section.timeSignature.top) + 1,
            beat: (sFlatIndex % workspace.section.timeSignature.top) + 1
          },
          end: {
            bar: parseInt(eFlatIndex / workspace.section.timeSignature.top) + 1,
            beat: (eFlatIndex % workspace.section.timeSignature.top) + 1
          }
        };
        audioVisualiser.firstBeat = sFlatIndex;
        audioVisualiser.lastBeat = eFlatIndex;
      } else {
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
      }

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

    $scope.playDrumSound = function(drumName) {
      var sound = {
        drum: drumName,
        volume: 0.85
      };
      audioPlayer.playDrumSample(workspace.track, sound);
    };


    function createSlides(trackSection) {
      var timeSignature = $scope.section.timeSignature;

      var slides = [];
      trackSection.forEachBeat(function(beat) {
        var slideId = beat.bar+'_'+beat.index;
        slides.push({
          id: slideId,
          beat: beat.beat,
          type: $scope.ui.instrumentIndex
        });
      });
      $scope.slides = slides;
    }

    function updateSwiperSlides() {
      $timeout(function() {
        swiperControl.setSlides($scope.slides, {
          slidesPerView: $scope.section.beatsPerView,
          slidesPerGroup: $scope.section.beatsPerSlide
        });
        $scope.updatePlaybackRange();
      });
    }

    $scope.initializeWorkspace = function(bassTrack, drumsTrack) {
      workspace.bassSection = new BassSection(workspace.section);
      workspace.drumSection = new DrumSection(workspace.section);
      assignTrack(workspace.bassSection, bassTrack);
      assignTrack(workspace.drumSection, drumsTrack);
      workspace.trackSection = (!workspace.trackSection || workspace.trackSection.type === 'bass')? workspace.bassSection : workspace.drumSection;
      workspace.track = workspace.trackSection.track;
    };

    $scope.initializeWorkspace(projectManager.project.tracksMap['bass_0'], projectManager.project.tracksMap['drums_0']);
    createSlides(workspace.trackSection);
    workspace.section.tracks = {
      'bass_0': workspace.bassSection,
      'drums_0': workspace.drumSection
    };
    updateSwiperSlides();

    function clearSectionWorkspace() {
      audioVisualiser.clear();

      workspace.bassSection.forEachBeat(function(beat) {
        workspace.trackSection.clearBeat(beat.beat);
      });
      workspace.drumsSection.forEachBeat(function(beat) {
        workspace.trackSection.clearBeat(beat.beat);
      });

    };

    function sectionLoaded(section) {
      // clearSectionWorkspace();
      $scope.section = section;
      $scope.player.playbackRange.start = 1;
      $scope.player.playbackRange.end = section.length + 1;
      $scope.updatePlaybackRange();

      console.log('sectionLoaded');
      var bassTrack = projectManager.project.tracksMap['bass_0'];
      var drumsTrack = projectManager.project.tracksMap['drums_0'];
      $scope.initializeWorkspace(bassTrack, drumsTrack);
      workspace.bassSection.loadBeats(section.tracks[bassTrack.id].data);
      workspace.drumSection.loadBeats(section.tracks[drumsTrack.id].data);
      workspace.section.tracks = {
        'bass_0': workspace.bassSection,
        'drums_0': workspace.drumSection
      };

      createSlides(workspace.trackSection);
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


      $timeout(function() {
        updateSlides();
        // updateSlides will delete 'visibleSubbeats' attribute from beats
        updateSubbeatsVisibility();
        $timeout(function() {
          $scope.bassSwiper.update();
        }, 10);
      }, 10)
    };

    function assignTrack(trackSection, track) {
      trackSection.instrument = track.instrument;
      trackSection.track = track;
      trackSection.audio = track.audio;
    };

    $scope.selectInstrument = function(index) {
      workspace.trackSection = index === 0? workspace.bassSection : workspace.drumSection;
      workspace.track = workspace.trackSection.track;

      swiperControl.switchInstrument(index);
      $scope.ui.instrumentIndex = index;
    };

    $scope.selectTrack = function(track) {
      if (workspace.track === track) {
        console.log('** same');
        return;
      }
      console.log('--- selectTrack: '+track.id);

      // Save/Convert sounds from instrument workspace into simple track data
      var convertedTrack;
      var data = angular.copy(projectManager.serializeSectionTrack(workspace.trackSection));
      if (workspace.trackSection.type === 'bass') {
        convertedTrack = new BassTrackSection(data);
      } else {
        convertedTrack = new DrumTrackSection(data);
      }
      var projectTrack = projectManager.project.tracksMap[workspace.track.id];
      convertedTrack.audio = projectTrack.audio;
      convertedTrack.instrument = projectTrack.instrument;
      // convertedTrack.instrument = workspace.trackSection.instrument;
      workspace.section.tracks[workspace.track.id] = convertedTrack;

      // Clear instrument workspace
      workspace.trackSection.forEachBeat(function(beat) {
        workspace.trackSection.clearBeat(beat.beat);
      });

      // Load instrument workspace with selected track data
      assignTrack(workspace.trackSection, track);
      if (workspace.section.tracks && workspace.section.tracks[track.id]) {
        workspace.trackSection.loadBeats(workspace.section.tracks[track.id].data);
      }
      workspace.section.tracks[track.id] = workspace.trackSection;
      workspace.track = track;
    };


    $scope.updateSlides = function() {
      workspace.bassSection.setLength(workspace.section.length);
      workspace.bassSection.setLength(workspace.section.length);
      createSlides(workspace.trackSection);
      $scope.player.playbackRange.end = workspace.section.length + 1;
      updateSwiperSlides();
    };

    // Load standard drums kit sounds
    var resources = Drums.Standard.map(function(drum) {
      return drum.filename;
    });
    audioPlayer.bufferLoader.loadResources(resources);
    // Load bongo drums kit sounds
    resources = Drums.Bongo.map(function(drum) {
      return drum.filename;
    });
    audioPlayer.bufferLoader.loadResources(resources);

    window.workspace = workspace;
    window.pm = projectManager;

    // Prevent default context menu
    window.oncontextmenu = function() {
      return false;
    }
  }
})();
