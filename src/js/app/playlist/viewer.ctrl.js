(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('PlaylistViewer', PlaylistViewer);


  function PlaylistViewer($scope, $timeout, audioPlayer, projectManager,
        workspace, HighlightTimeline, slidesCompiler, fretboardViewer) {

    var viewerTrackId = workspace.bassSection? workspace.bassSection.track.id : 'bass_0';

    var viewer = {
      beatsPerSlide: 8,
      // swiper config
      direction: 'vertical',
      slidesPerView: 1.99,
      slidesPerColumn: 1,
      animation: 300,
      render: {
        initialHeaderOn: 'all'
      },
      emptyLastSlide: true,
      update: angular.noop
    }
    $scope.viewer = viewer;

    var playlist;
    var playlistSlidePosition;
    var playbackState;
    var slidesMetadata;
    var playerSwiper;


    function updateSlide(slideIndex, position, count) {
      console.log('updating slide');
      var slideMeta = slidesMetadata[slideIndex];
      var slideWrapper = playerSwiper.slides[slideIndex];
      if (!slideMeta || !slideWrapper || !slideWrapper.firstChild) {
        return;
      }
      slidesCompiler.updateSlide($scope, slideWrapper, slideMeta, viewerTrackId);
    }

    function generateSlide() {
      console.log('generate NEXT slide');
      console.log(playlistSlidePosition)
      var slide = slidesCompiler.generateSlide(
        $scope,
        playlist,
        playlistSlidePosition,
        viewer.beatsPerSlide,
        viewerTrackId,
        viewer.render
      );
      if (slide.data.beats.length > 0) {
        playerSwiper.appendSlide(slide.elem);
        slidesMetadata[playerSwiper.slides.length-1] = slide.data;
      }
    }

    var timeline = new HighlightTimeline({
      getBeatElem: function(bar, beat) {
        var slideIndex = playerSwiper.snapIndex;
        var beatIndex = playbackState.beatsCounter;
        if (playbackState.beatsCounter >= viewer.beatsPerSlide) {
          slideIndex += 1;
          beatIndex -= viewer.beatsPerSlide;
        }
        // console.log('slideIndex: '+slideIndex+' beatIndex: '+beatIndex);
        // console.log('{0} -> {1}/{2}'.format(playbackState.beatsCounter, slideIndex, beatIndex));
        var beatsElems = playerSwiper.slides[slideIndex].querySelectorAll('.beat');
        var beatElem = beatsElems[beatIndex];
        return beatElem;
      },
      getBarWrapper: function() {
        return playerSwiper.wrapper[0];
      }
    });

    function initializeSwiper() {
      console.log('initializeSwiper')
      var swiperElem = document.querySelector('.playlist-swiper');
      playerSwiper = new Swiper(swiperElem, {
        spaceBetween: 0,
        direction: viewer.direction,
        slidesPerView: viewer.slidesPerView,
        slidesPerColumn: viewer.slidesPerColumn,
        initialSlide: 0,
        roundLengths: true
      });

      playerSwiper.on('transitionEnd', function(s) {
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
        console.log('activeIndex: {0} slides: {1}'.format(s.activeIndex, s.slides.length));
        if (s.slides.length - s.activeIndex <=  2 ) {
          generateSlide();
        }
        if (s.activeIndex > 1) {
          // angular.element(s.slides[0]).scope().$destroy();
          /* auto-removing of slides */
          // s.removeSlide(0);
        }
      });
    }

    function initPlaylistSlides() {
      console.log('initPlaylistSlides')
      if (!playerSwiper) return;
      playlist = [];
      slidesMetadata = [];
      var index = 1;
      workspace.playlist.items.forEach(function(item) {
        var section = projectManager.getSection(item.section);
        for (var i = 0; i < item.repeats; i++) {
          if (index >= $scope.player.playbackRange.start && index <= $scope.player.playbackRange.end) {
            playlist.push(section);
          }
          index++;
        }
      });
      playlistSlidePosition = {
        section: 0,
        bar: 1,
        beat: 1
      };
      playbackState = {
        section: 0,
        beatsCounter: -1
      };
      playerSwiper.slideTo(0, 0, false);
      playerSwiper.removeAllSlides();
      playerSwiper.lastSlide = false;

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
      playbackState.beatsCounter++;
      if (playbackState.beatsCounter >= viewer.beatsPerSlide) {

        if (!$scope.player.visibleBeatsOnly) {
          playbackState.beatsCounter = 0;
          playerSwiper.slideNext(true, viewer.animation);
        } else {
          if (playbackState.beatsCounter+2 === viewer.beatsPerSlide * 2) {
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
        }
      }
      timeline.beatSync(evt);
      fretboardViewer.beatSync(evt);
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
      var countdown = $scope.player.countdown && (start || playbackState.section === 0);
      audioPlayer.play(section, beatSync, playbackStopped, countdown);
    }

    function playFromCurrentPosition() {
      console.log('playFromCurrentPosition');
      var firstSlideMeta = slidesMetadata[playerSwiper.snapIndex];
      var visibleBeatsMeta = firstSlideMeta.beats.concat(slidesMetadata[playerSwiper.snapIndex+1].beats);

      playbackState.section = firstSlideMeta.playlistSectionIndex;
      playbackState.bar = firstSlideMeta.beats[0].bar;
      playbackState.beat = firstSlideMeta.beats[0].beat;
      playbackState.beatsCounter = -1;
      var start = {
        bar: playbackState.bar,
        beat: playbackState.beat
      }
      playSection(start);
    }

    function failedToLoadResources() {
      $scope.player.playing = false;
    }

    $scope.player.play = function() {
      var sections = playlist.reduce(function(list, section) {
        if (list.indexOf(section) === -1) {
          list.push(section);
        }
        return list;
      }, []);

      if ($scope.player.visibleBeatsOnly) {
        // var firstSlideMeta = slidesMetadata[playerSwiper.snapIndex];
        // var visibleBeatsMeta = firstSlideMeta.beats.concat(slidesMetadata[playerSwiper.snapIndex+1].beats);

        // build a list of used sections
        // var sections = [];
        // new Set(visibleBeatsMeta.map(function(betaMeta) {return betaMeta.section}))
        //   .forEach(function(sectionid) {
        //     sections.push(projectManager.getSection(sectionid));
        //   });

        $scope.player.playing = true;
        audioPlayer.fetchResourcesWithProgress(sections).then(playFromCurrentPosition, failedToLoadResources);

      } else {
        var initSlides;
        if (playerSwiper.snapIndex !== 0) {
          initPlaylistSlides();
        } else {
          playbackState = {
            section: 0,
            beatsCounter: -1
          };
        }
        $scope.player.playing = true;
        audioPlayer.fetchResourcesWithProgress(sections).then(playSection, failedToLoadResources);
      }
    };

    $scope.player.stop = function() {
      $scope.player.playing = false;
      playbackState.section = playlist.length;
      audioPlayer.stop();
    };

    function playbackStopped(evt) {
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
            playbackState.beatsCounter = -1;
            playerSwiper.slideTo(0, 0);
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
      workspace.track = projectManager.project.tracksMap[trackId];
      viewerTrackId = trackId;

      if (slidesMetadata) {
        updateSlide(playerSwiper.snapIndex);
        updateSlide(playerSwiper.snapIndex+1);
        if (playerSwiper.snapIndex > 0) {
          updateSlide(playerSwiper.snapIndex-1);
        }
        updateSlide(playerSwiper.snapIndex+2);

        /*
        // delete generated slides after
        var slideMeta = slidesMetadata[playerSwiper.snapIndex+3];
        if (slideMeta) {
          var slidesToDelete = [];
          playlistSlidePosition.section = slideMeta.playlistSectionIndex;
          playlistSlidePosition.bar = slideMeta.beats[0].bar;
          playlistSlidePosition.beat = slideMeta.beats[0].beat;
          var slide = playerSwiper.snapIndex+3;
          while (slide < playerSwiper.slides.length) {
            slidesToDelete.push(slide);
            slide++;
          }
          console.log('delete slides: '+slidesToDelete);
          playerSwiper.removeSlide(slidesToDelete);
        }
        */
      } else {
        initPlaylistSlides();
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
      workspace.playlist = playlist;
      workspace.selectedPlaylistId = playlist.id;
      updatePlaylistRange();
      initPlaylistSlides();
    }

    function projectLoaded(project) {
      console.log('projectLoaded');
      workspace.playlist = project.playlists[0];
      $scope.sectionNames = {};
      slidesMetadata = null;
      projectManager.project.sections.forEach(function(section) {
        $scope.sectionNames[section.id] = section.name;
      });
      updatePlaylistRange();

      if (workspace.playlist.items.length === 0) {
        console.log('SHOW PLAYLIST EDITOR');
        $scope.ui.playlist.showEditor = true;
        playerSwiper.removeAllSlides();
      } else {
        workspace.selectedPlaylistId = workspace.playlist.id;
      }
      $scope.ui.trackId = 'bass_0';
      $scope.ui.selectTrack($scope.ui.trackId);
    }


    audioPlayer.setPlaybackSpeed($scope.player.speed/100);
    $scope.ui.playbackSpeedChanged = function(speed) {
      audioPlayer.setPlaybackSpeed(speed/100);
    };

    projectManager.on('playlistLoaded', playlistLoaded);
    projectManager.on('projectLoaded', projectLoaded);


    // ugly autoselect to bass guitar track
    if (workspace.track && workspace.track.type !== 'bass') {
      $scope.ui.trackId = 'bass_0';
      $scope.ui.selectTrack($scope.ui.trackId);
    }


    $scope.player.visiblePlaybackModeChanged = function(visibleBeatsOnly) {
      if (!visibleBeatsOnly && playbackState.beatsCounter >= viewer.beatsPerSlide) {
        playbackState.beatsCounter -= viewer.beatsPerSlide;
        playerSwiper.slideNext(true, viewer.animation);
      }
    };

    $scope.player.playbackRangeChanged = function() {
      initPlaylistSlides();
    };


    slidesCompiler.setTemplate('views/playlist/slide.html').then(function() {
      initializeSwiper();
      $timeout(projectLoaded.bind(this, projectManager.project));
    });

    $scope.$on('$destroy', function() {
      projectManager.un('playlistLoaded', playlistLoaded);
      projectManager.un('projectLoaded', projectLoaded);
    });

    // window.sw = playerSwiper;
  }
})();
