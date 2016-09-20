(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('EditModeController', EditModeController)

  function EditModeController($scope, $timeout, context, workspace, audioPlayer, audioVisualiser, projectManager, Drums,
                         BassSection, DrumSection, BassTrackSection, DrumTrackSection, HighlightTimeline, swiperControl) {


    $scope.swiperControl = swiperControl;
    $scope.slides = [];

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
    $scope.player.play = function() {
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
        audioVisualiser.activate(workspace.bassSection.audio);
      }
      audioPlayer.countdown = $scope.player.countdown;
      timeline.start();
      repeats = 1;
      audioPlayer.play($scope.section, beatPrepared, $scope.player.loop? -1 : 1);
    };

    $scope.player.stop = function() {
      audioPlayer.stop();
    };

    function playbackStopped() {
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
    }
    audioPlayer.on('playbackStopped', playbackStopped);


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
          type: workspace.track.type
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


    $scope.ui.selectTrack = function(trackId) {
      console.log('selectTrack: '+trackId);
      var track = projectManager.project.tracksMap[trackId];
      if (workspace.track === track) {
        return;
      }
      if (workspace.track.type !== track.type) {
        workspace.trackSection = track.type === 'bass'? workspace.bassSection : workspace.drumSection;
        swiperControl.switchInstrument(track.type);
      }

      if (workspace.trackSection.track.id !== track.id) {

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
          workspace.trackSection.loadBeats(workspace.section.tracks[track.id].data || []);
        }
        workspace.section.tracks[track.id] = workspace.trackSection;
      }

      workspace.track = track;
    };


    $scope.updateSlides = function() {
      workspace.bassSection.setLength(workspace.section.length);
      workspace.bassSection.setLength(workspace.section.length);
      createSlides(workspace.trackSection);
      $scope.player.playbackRange.end = workspace.section.length + 1;
      updateSwiperSlides();
    };

    $scope.$on('$destroy', function() {
      projectManager.un('sectionCreated', clearSectionWorkspace);
      projectManager.un('sectionDeleted', clearSectionWorkspace);
      projectManager.un('sectionLoaded', sectionLoaded);
      audioPlayer.un('playbackStopped', playbackStopped);
    });

  }
})();
