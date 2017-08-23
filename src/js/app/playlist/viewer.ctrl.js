(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('PlaylistViewer', PlaylistViewer);


  function PlaylistViewer($scope, $timeout, $element, $mdUtil, audioPlayer, projectManager,
        workspace, HighlightTimeline, slidesCompiler, fretboardViewer) {

    var viewerTrackId = workspace.track && workspace.track.type !== 'piano' ? workspace.track.id : 'bass_0';

    if (!$scope.viewer) {
      console.log('Initializing viewer')
      var layouts = [
        {
          name: 'vertical',
          // swiper config
          direction: 'vertical',
          slidesPerView: 1.995,
          slidesPerColumn: 1,
          animation: 300,
          render: {
            initialHeaderOn: 'all'
          },
          emptyLastSlide: true
        }, {
          name: 'horizontal',
          // swiper config
          direction: 'horizontal',
          slidesPerView: 1.004,
          slidesPerColumn: 1,
          animation: 0,
          render: {
          },
          emptyLastSlide: false
        }
      ];
      $scope.$root.viewer = {
        beatsPerSlide: 8,
        layouts: layouts,
        layout: layouts[window.innerHeight >= 680? 0 : 1],
        swiper: null
      }
    }
    var viewer = $scope.viewer;

    var playlist;
    var playlistSlidePosition;
    var playbackState;
    var slidesMetadata;


    function updateSlide(slideIndex, position, count) {
      var slideMeta = slidesMetadata[slideIndex];
      var slideWrapper = viewer.swiper.slides[slideIndex];
      if (!slideMeta || !slideWrapper || !slideWrapper.firstChild) {
        return;
      }
      slidesCompiler.updateSlide($scope, slideWrapper, slideMeta, viewerTrackId);
    }

    function generateSlide() {
      // console.log('generate NEXT slide');
      // console.log(playlistSlidePosition)
      var slide = slidesCompiler.generateSlide(
        $scope,
        playlist,
        playlistSlidePosition,
        viewer.beatsPerSlide,
        viewerTrackId,
        viewer.layout.render
      );
      if (slide.data.beats.length > 0) {
        viewer.swiper.appendSlide(slide.elem);
        slidesMetadata[viewer.swiper.slides.length-1] = slide.data;
      }
    }

    var timeline = new HighlightTimeline({
      getBeatElem: function(bar, beat) {
        var slideIndex = viewer.swiper.snapIndex;
        var beatIndex = playbackState.slideBeatCounter;
        if (playbackState.slideBeatCounter >= viewer.beatsPerSlide) {
          slideIndex += 1;
          beatIndex -= viewer.beatsPerSlide;
        }
        // console.log('slideIndex: '+slideIndex+' beatIndex: '+beatIndex);
        // console.log('{0} -> {1}/{2}'.format(playbackState.slideBeatCounter, slideIndex, beatIndex));
        var beatsElems = viewer.swiper.slides[slideIndex].querySelectorAll('.bar-beat');
        var beatElem = beatsElems[beatIndex];
        return beatElem;
      },
      getBarWrapper: function() {
        return viewer.swiper.wrapper[0];
      }
    });

    function initializeSwiper(options) {
      var swiperElem = document.querySelector('.playlist-swiper');

      var params = angular.extend({
        spaceBetween: 0,
        direction: viewer.layout.direction,
        slidesPerView: viewer.layout.slidesPerView,
        slidesPerColumn: viewer.layout.slidesPerColumn,
        initialSlide: 0,
        roundLengths: true,
        mousewheelControl: true,
        watchSlidesVisibility: true
      }, options);
      viewer.swiper = new Swiper(swiperElem, params);

      viewer.swiper.on('transitionEnd', function(s) {
        var sIndex = Math.max(s.snapIndex-1, 0);
        var eIndex = Math.min(s.snapIndex+2, s.slides.length);
        for (var index = sIndex; index <= eIndex; index++) {
          var slideMeta = slidesMetadata[index];
          if (slideMeta && slideMeta.track !== viewerTrackId) {
            updateSlide(index);
          }
        }
        // if (s.snapIndex > 0 && slidesMetadata[s.snapIndex-1].track !== viewerTrackId) {
        //   console.log('upside slide needs update');
        //   updateSlide(s.snapIndex-1);
        // }
        // console.log('activeIndex: {0} slides: {1}'.format(s.snapIndex, s.slides.length));
        if (s.slides.length - s.snapIndex <=  2 ) {
          generateSlide();
        }
        if (s.snapIndex > 1) {
          // angular.element(s.slides[0]).scope().$destroy();
          /* auto-removing of slides */
          // s.removeSlide(0);
        }
      });
      var updatePlayerProgress = function(s) {
        s.activeIndex = s.snapIndex;
        $scope.player.progress.update(s.snapIndex * viewer.beatsPerSlide);
      }
      viewer.swiper.on('touchEnd', updatePlayerProgress);
      viewer.swiper.on('onScroll', updatePlayerProgress);
    }

    function initPlaylistSlides() {
      console.log('initPlaylistSlides')
      playlist = [];
      slidesMetadata = [];
      var index = 1;
      var beatsCount = 0;
      var sectionsTicks = [];
      var legend = {}; // beat -> section id

      workspace.playlist.items.forEach(function(item) {
        var section = projectManager.getSection(item.section);
        for (var i = 0; i < item.repeats; i++) {
          if (index >= $scope.player.playbackRange.start && index <= $scope.player.playbackRange.end) {
            playlist.push(section);
            sectionsTicks.push(beatsCount);
            legend[beatsCount] = item.section;
            beatsCount += section.length * section.timeSignature.top;
          }
          index++;
        }
      });
      sectionsTicks.splice(0, 1);
      $scope.player.progress.value = 0;
      $scope.player.progress.max = beatsCount - 1;
      $scope.player.progress.ticks = sectionsTicks;
      $scope.player.progress.legend = function(value) {
        return $scope.sectionNames[legend[value]];
      };

      playlistSlidePosition = {
        section: 0,
        bar: 1,
        beat: 1
      };
      playbackState = {
        section: 0,
        slideBeatCounter: -1,
        beatCounter: -1
      };
      // window.playbackState = playbackState;

      if (viewer.swiper) {
        viewer.swiper.slideTo(0, 0, false);
        viewer.swiper.removeAllSlides();
        viewer.swiper.lastSlide = false;
      }
      var iterations = 3;
      while (iterations--) {
        generateSlide();
      }
    }

    $scope.updatePlaylist = function() {
      updatePlaylistRange();
      initPlaylistSlides();
    }


    function beatSync(evt) {
      if (!evt.playbackActive) {
        return;
      }

      playbackState.slideBeatCounter++;
      if (playbackState.slideBeatCounter+2 >= viewer.beatsPerSlide) {

        if ($scope.player.visibleBeatsOnly) {
          var visibleBeats = viewer.beatsPerSlide * Math.round(viewer.layout.slidesPerView);
          if (playbackState.slideBeatCounter+2 === visibleBeats) {
            // setup end of visible screen playback
            playbackState.section = playlist.length;
            if (evt.beat < evt.timeSignature.top) {
              audioPlayer.playbackRange.end = {
                bar: evt.bar,
                beat: evt.beat + 1
              };
            } else {
              audioPlayer.playbackRange.end = {
                bar: evt.bar + 1,
                beat: 2
              };
            }
          }
        } else if (playbackState.slideBeatCounter >= viewer.beatsPerSlide && !viewer.swiper.isEnd) {
          playbackState.slideBeatCounter = 0;
          viewer.swiper.slideNext(true, viewer.layout.animation);
          viewer.swiper.activeIndex = viewer.swiper.snapIndex;
        }
      }
      timeline.beatSync(evt);
      fretboardViewer.beatSync(evt);

      playbackState.beatCounter++;
      $scope.player.progress.update(playbackState.beatCounter);
    }

    function playSection(start) {
      var section = playlist[playbackState.section];
      audioPlayer.setBpm(section.bpm);

      audioPlayer.playbackRange = {
        start: start || { bar: 1, beat: 1 },
        end: {
          bar: section.length,
          beat: section.timeSignature.top
        }
      };
      // audioPlayer.countdown = $scope.player.countdown;
      timeline.start();
      var options = {
        countdown: $scope.player.countdown && (angular.isDefined(start) || playbackState.section === 0),
        start: start || { bar: 1, beat: 1 }
      }
      if (projectManager.project.audioTrack && section.audioTrackStart) {
        options.audioTrack = {
          data: projectManager.project.audioTrack.data,
          audio: projectManager.project.audioTrack.audio,
          start: section.audioTrackStart.split(":").map(Number)
        }
      }
      audioPlayer.play(section, beatSync, playbackStopped, options);
    }

    function playFromCurrentPosition() {
      var firstSlideMeta = slidesMetadata[viewer.swiper.snapIndex];
      var visibleBeatsMeta = firstSlideMeta.beats;
      if (slidesMetadata[viewer.swiper.snapIndex+1]) {
        visibleBeatsMeta = visibleBeatsMeta.concat(slidesMetadata[viewer.swiper.snapIndex+1].beats);
      }

      playbackState.section = firstSlideMeta.playlistSectionIndex;
      playbackState.bar = firstSlideMeta.beats[0].bar;
      playbackState.beat = firstSlideMeta.beats[0].beat;
      playbackState.slideBeatCounter = -1;
      var start = {
        bar: playbackState.bar,
        beat: playbackState.beat
      }
      // calculate position of beatCounter
      playbackState.beatCounter = -1;
      playbackState.beatCounter += (playbackState.bar - 1) * playlist[playbackState.section].timeSignature.top;
      playbackState.beatCounter += playbackState.beat - 1;
      var sectionIndex = playbackState.section;
      while (sectionIndex--) {
        var section = playlist[sectionIndex];
        playbackState.beatCounter += section.length * section.timeSignature.top;
      }

      playSection(start);
    }

    function failedToLoadResources() {
      $scope.player.playing = false;
    }

    $scope.player.play = function() {
      fretboardViewer.clearDiagram();
      var sections = playlist.reduce(function(list, section) {
        if (list.indexOf(section) === -1) {
          list.push(section);
        }
        return list;
      }, []);

      if ($scope.player.visibleBeatsOnly) {
        // var firstSlideMeta = slidesMetadata[viewer.swiper.snapIndex];
        // var visibleBeatsMeta = firstSlideMeta.beats.concat(slidesMetadata[viewer.swiper.snapIndex+1].beats);

        // build a list of used sections
        // var sections = [];
        // new Set(visibleBeatsMeta.map(function(betaMeta) {return betaMeta.section}))
        //   .forEach(function(sectionid) {
        //     sections.push(projectManager.getSection(sectionid));
        //   });

        $scope.player.playing = true;
        audioPlayer.fetchResourcesWithProgress(sections).then(playFromCurrentPosition, failedToLoadResources);

      } else {
        /*
        if (viewer.swiper.snapIndex !== 0) {
          initPlaylistSlides();
        } else {
          playbackState = {
            section: 0,
            slideBeatCounter: -1,
            beatCounter: -1
          };
        }
        */
        $scope.player.playing = true;
        audioPlayer.fetchResourcesWithProgress(sections).then(playFromCurrentPosition, failedToLoadResources);
      }
    };

    $scope.player.pause = function() {
      $scope.player.playing = false;
      playbackState.section = playlist.length;
      audioPlayer.stop(true);
    };

    $scope.player.goToStart = function() {
      var restartPlayback = $scope.player.playing;
      if ($scope.player.playing) {
        $scope.player.pause();
      }
      $scope.player.progress.value = 0;
      setTimeout(function() {
        viewer.swiper.slideTo(0, 0);
        if (restartPlayback) {
          $scope.player.play();
        }
      }, 50);
    }

    function playbackStopped(evt) {
      if (workspace.playlist.onPlaybackEnd) {
        workspace.playlist.onPlaybackEnd(evt);
      }
      playbackState.section++;
      if ($scope.player.playing && playbackState.section < playlist.length) {
        // continue in playlist
        playSection();
      } else {
        if ($scope.player.playing && $scope.player.loop) {
          if ($scope.player.visibleBeatsOnly) {
            // repeat visible playback
            playFromCurrentPosition();
          } else {
            // repeat playlist playback
            playbackState.section = 0;
            playbackState.beatCounter = -1;
            playbackState.slideBeatCounter = -1;
            viewer.swiper.slideTo(0, 0);
            playSection();
          }
        } else {
          // stop playback
          timeline.stop();
          playbackState.section = 0;
          $scope.player.playing = false;
        }
      }
    }


    $scope.ui.selectTrack = function(trackId) {
      // console.log('## selectTrack '+trackId)
      workspace.track = projectManager.project.tracksMap[trackId];
      viewerTrackId = trackId;
      if (slidesMetadata) {
        updateSlide(viewer.swiper.snapIndex);
        updateSlide(viewer.swiper.snapIndex+1);
        if (viewer.swiper.snapIndex > 0) {
          updateSlide(viewer.swiper.snapIndex-1);
        }
        updateSlide(viewer.swiper.snapIndex+2);

        /*
        // delete generated slides after
        var slideMeta = slidesMetadata[viewer.swiper.snapIndex+3];
        if (slideMeta) {
          var slidesToDelete = [];
          playlistSlidePosition.section = slideMeta.playlistSectionIndex;
          playlistSlidePosition.bar = slideMeta.beats[0].bar;
          playlistSlidePosition.beat = slideMeta.beats[0].beat;
          var slide = viewer.swiper.snapIndex+3;
          while (slide < viewer.swiper.slides.length) {
            slidesToDelete.push(slide);
            slide++;
          }
          console.log('delete slides: '+slidesToDelete);
          viewer.swiper.removeSlide(slidesToDelete);
        }
        */
      } else {
        initPlaylistSlides();
      }
      // adjust layout by available screen space
      if (viewer.swiper.slides.length) {
        var updateLayout = false;
        var slideHeight = viewer.swiper.slides[viewer.swiper.snapIndex].lastChild.offsetHeight;
        if (slideHeight > viewer.swiper.size / viewer.layout.slidesPerView) {
          viewer.swiper.params.slidesPerView = viewer.swiper.size / (slideHeight+20);
          updateLayout = true;
        } else if (viewer.swiper.params.slidesPerView !== viewer.layout.slidesPerView) {
          viewer.swiper.params.slidesPerView = viewer.layout.slidesPerView;
          updateLayout = true;
        }
        if (updateLayout) {
          viewer.swiper.updateSlidesSize();
          viewer.swiper.slideTo(viewer.swiper.snapIndex, 0, false);
        }
      }
    }

    function updatePlaylistRange() {
      $scope.player.playlist.splice(0, $scope.player.playlist.length);
      workspace.playlist.items.forEach(function(item) {
        for (var i = 0; i < item.repeats; i++) {
          $scope.player.playlist.push($scope.sectionNames[item.section]);
        }
      });
      // $scope.player.playlist = playlist;
      $scope.player.playbackRange.start = 1;
      $scope.player.playbackRange.max = $scope.player.playlist.length;
      $scope.player.playbackRange.end = $scope.player.playbackRange.max;
    }

    function playlistLoaded(playlist) {
      console.log('playlistLoaded')
      workspace.playlist = playlist;
      workspace.selectedPlaylistId = playlist.id;
      updatePlaylistRange();
      initPlaylistSlides();
      fretboardViewer.clearDiagram();
    }


    function projectLoaded(project) {
      console.log('projectLoaded');
      if (!viewer.swiper) {
        return;
      }
      $scope.sectionNames = {};
      slidesMetadata = null;
      projectManager.project.sections.forEach(function(section) {
        $scope.sectionNames[section.id] = section.name;
      });

      if (workspace.track && workspace.track.type === 'piano') {
        $scope.ui.trackId = 'bass_0';
        workspace.track = projectManager.project.tracksMap[viewerTrackId];
      }
      playlistLoaded(project.playlists[0]);

      if (workspace.playlist.items.length === 0) {
        $scope.ui.playlist.showEditor = true;
        viewer.swiper.removeAllSlides();
      }
      $scope.ui.selectTrack($scope.ui.trackId);
    }


    audioPlayer.setPlaybackSpeed($scope.player.speed/100);
    $scope.ui.playbackSpeedChanged = function(speed) {
      audioPlayer.setPlaybackSpeed(speed/100);
    };

    $scope.player.setProgress = function(id, value) {
      if ($scope.player.playing) {
        $scope.player.playing = false;
        audioPlayer.stop(true);
        $scope.player.progress.restartPlayback = true;
      }

      // var slide = Math.round(value / viewer.beatsPerSlide);
      var slide = parseInt(value / viewer.beatsPerSlide);

      var missingSlides = slide + Math.round(viewer.layout.slidesPerView) - viewer.swiper.slides.length;
      if (missingSlides > 0) {
        while (missingSlides > 0) {
          console.log('generating slide');
          generateSlide();
          missingSlides--;
        }
        setTimeout(function() {
          viewer.swiper.slideTo(slide, 0, true);
        }, 50);
      } else {
        viewer.swiper.slideTo(slide, 0, true);
      }
    };
    $scope.player.progressReleased = function(id, value) {
      if ($scope.player.progress.restartPlayback) {
        $scope.player.progress.restartPlayback = false;
        // wait a little for rendering
        $timeout($scope.player.play, 75);
      }
    }

    projectManager.on('playlistLoaded', playlistLoaded);
    projectManager.on('projectLoaded', projectLoaded);


    $scope.player.visiblePlaybackModeChanged = function(visibleBeatsOnly) {
      if (!visibleBeatsOnly && playbackState.slideBeatCounter >= viewer.beatsPerSlide) {
        playbackState.slideBeatCounter -= viewer.beatsPerSlide;
        viewer.swiper.slideNext(true, viewer.layout.animation);
      }
    };

    $scope.player.playbackRangeChanged = function() {
      initPlaylistSlides();
    };


    $mdUtil.nextTick(function() {
      initializeSwiper();
      if (projectManager.project) {
        $mdUtil.nextTick(projectLoaded.bind(this, projectManager.project));
      }
    });

    viewer.updateLayout = function() {
      var position = $scope.player.progress.value;
      var slideIndex = viewer.swiper.snapIndex;
      viewer.swiper.removeAllSlides();
      viewer.swiper.container.removeClass('swiper-container-' + viewer.swiper.params.direction);
      viewer.swiper.destroy();
      initializeSwiper();
      initPlaylistSlides();

      $scope.player.progress.value = position;
      $scope.player.setProgress(1, position);
      // $mdUtil.nextTick($scope.player.setProgress.bind($scope, 1, position));

      // $scope.player.setProgress(position);
      // if (slideIndex > 0) {
      //   viewer.swiper.slideTo(slideIndex, true, 0);
      // }
    }

    viewer.setFretboardVisible = function(visible) {
      viewer.fretboardVisible = visible;
      $mdUtil.nextTick(function() {
        viewer.swiper.onResize();
        var elem = $element[0].querySelector('.fretboard-container');
        fretboardViewer.activate(visible? elem : null);
      });
    }

    if (viewer.fretboardVisible) {
      $scope.setFretboardVisible(true);
    }

    $scope.$on('$destroy', function() {
      projectManager.un('playlistLoaded', playlistLoaded);
      projectManager.un('projectLoaded', projectLoaded);
    });

    window.v = viewer;
  }
})();
