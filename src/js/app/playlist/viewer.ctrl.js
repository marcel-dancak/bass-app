(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('PlaylistViewer', PlaylistViewer);


  var EMPTY_TRACK = {
    beat: function(bar, beat) {
      return {
        bar: bar,
        beat: beat,
        subdivision: 4
      };
    },
    beatSounds: function() {
      return [];
    }
  };

  function PlaylistViewer($scope, $timeout, $q, audioPlayer, projectManager, workspace, $mdCompiler, HighlightTimeline) {

    var viewerTrackId = workspace.bassSection.track.id;

    var playlist;
    var playlistSlidePosition;
    var beatsPerSlide = 8;
    var playbackState;
    var slidesMetadata;


    function updateSlide(slideIndex, position, count) {
      console.log('updating slide');
      var slideMeta = slidesMetadata[slideIndex];
      var slideWrapper = playerSwiper.slides[slideIndex];
      if (!slideMeta || !slideWrapper || !slideWrapper.firstChild) {
        return;
      }

      slideWrapper.firstChild.remove();

      var section = {id: -1};
      var track;
      slideMeta.beats.forEach(function(beat) {
        if (beat.section !== section.id) {
          section = projectManager.getSection(beat.section);// || {tracks: {}};
          track = section.tracks[viewerTrackId] || EMPTY_TRACK;
        }
        var trackBeat = track.beat(beat.bar, beat.beat)
        beat.sounds = track.beatSounds(trackBeat);
        beat.subdivision = trackBeat.subdivision;
      });
      slideMeta.track = viewerTrackId;

      var scope = $scope.$new(false);
      scope.beats = slideMeta.beats;
      scope.emptyBeats = slideMeta.emptyBeats;
      $mdCompiler.compile({
        templateUrl: 'views/playlist/slide.html'
      }).then(function(compileData) {
        //attach controller & scope to element
        var slideElement = compileData.link(scope)[0];
        slideWrapper.appendChild(slideElement);
        $timeout(function() {
          scope.$destroy();
        });
      });
    }

    function generateSlide(playlist, position, count) {
      var task = $q.defer();

      var section = playlist[position.section];
      if (!section) {
        if (!playerSwiper.lastSlide) {
          console.log('** create empty slide');
          playerSwiper.appendSlide('<div class="swiper-slide"></div>');
          playerSwiper.lastSlide = true;
        }
        return $q.when();
      }

      var metadata = {
        playlistSectionIndex: position.section,
        track: viewerTrackId
      };
      var beats = [];
      var track = section.tracks[viewerTrackId] || EMPTY_TRACK;
      var counter = count;
      while (counter--) {
        var sectionFirstsBeat = position.bar === 1 && position.beat === 1;

        var trackBeat = track.beat(position.bar, position.beat);

        var chordLabels = [];
        if (section.meta && section.meta.chords) {
          chordLabels = section.meta.chords
            .filter(function(chord) {
              return chord.start[0] === trackBeat.bar && chord.start[1] === trackBeat.beat;
            })
            .map(function(chord) {
              return {
                label: (chord.root || '')+(chord.type || ''),
                subbeat: chord.start[2]
              };
            });
        }
        beats.push({
          section: section.id,
          bar: position.bar,
          beat: position.beat,
          subdivision: trackBeat.subdivision,
          chordLabels: chordLabels,
          meta: trackBeat.meta,
          sounds: track.beatSounds(trackBeat),
          timeSignature: section.timeSignature,
          bpm: section.bpm,
          subbeats: [1, 2, 3, 4]
        });
        if (sectionFirstsBeat) {
          beats[beats.length-1].sectionInfo = {
            name: section.name,
          };

        }
        position.beat++;
        if (position.beat > section.timeSignature.top) {
          position.beat = 1;
          position.bar++;
          if (position.bar > section.length) {
            position.bar = 1;
            position.section++;
            section = playlist[position.section];
            if (!section) break;
            track = section.tracks[viewerTrackId];
          }
        }
      }

      // generate empty beats to fill slide (when needed)
      var emptyBeats = new Array(count-beats.length);
      metadata.beats = beats;
      metadata.emptyBeats = emptyBeats;
      slidesMetadata.push(metadata);

      var scope = $scope.$new(false);
      scope.beats = beats;
      scope.emptyBeats = emptyBeats;

      $mdCompiler.compile({
        templateUrl: 'views/playlist/slide.html'
      }).then(function(compileData) {
        //attach controller & scope to element
        var slideElement = compileData.link(scope);
        var slideWrapper = angular.element('<div class="swiper-slide"></div>');
        slideWrapper.append(slideElement);
        playerSwiper.appendSlide(slideWrapper[0]);
        $timeout(function() {
          scope.$destroy();
          task.resolve();
        });
      });
      return task.promise;
    }

    var playerSwiper;

    var timeline = new HighlightTimeline({
      getBeatElem: function(bar, beat) {
        var slideIndex = playerSwiper.snapIndex;
        var beatIndex = playbackState.beatsCounter;
        if (playbackState.beatsCounter >= beatsPerSlide) {
          slideIndex += 1;
          beatIndex -= beatsPerSlide;
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
      var swiperElem = document.querySelector('.playlist-swiper');
      playerSwiper = new Swiper(swiperElem, {
        spaceBetween: 0,
        direction: 'vertical',
        slidesPerView: 1.99,
        slidesPerColumn: 1,
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
          console.log('generate NEXT slide');
          generateSlide(playlist, playlistSlidePosition, beatsPerSlide);
        }
        if (s.activeIndex > 1) {
          // angular.element(s.slides[0]).scope().$destroy();
          /* auto-removing of slides */
          // s.removeSlide(0);
        }
      });
    }

    initializeSwiper();

    function initPlaylistSlides() {
      var task = $q.defer();
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
      var generate = function() {
        var promise = generateSlide(playlist, playlistSlidePosition, beatsPerSlide);
        if (--iterations > 0) {
          promise.then(generate);
        } else {
          promise.then(task.resolve);
        }
      }
      generate();
      return task.promise;
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
      if (playbackState.beatsCounter >= beatsPerSlide) {

        if (!$scope.player.visibleBeatsOnly) {
          playbackState.beatsCounter = 0;
          playerSwiper.slideNext();
        } else {
          if (playbackState.beatsCounter+2 === beatsPerSlide * 2) {
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
      audioPlayer.play(section, beatSync, countdown);
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
          initSlides = initPlaylistSlides();
        } else {
          playbackState = {
            section: 0,
            beatsCounter: -1
          };
          initSlides = $q.when();
        }
        initSlides.then(function() {
          $scope.player.playing = true;
          audioPlayer.fetchResourcesWithProgress(sections).then(playSection, failedToLoadResources);
        });
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

    audioPlayer.on('playbackStopped', playbackStopped);

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
        initPlaylistSlides();
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

    projectLoaded(projectManager.project);

    // ugly autoselect to bass guitar track
    if (workspace.track && workspace.track.type !== 'bass') {
      $scope.ui.trackId = 'bass_0';
      $scope.ui.selectTrack($scope.ui.trackId);
    }

    $scope.player.visiblePlaybackModeChanged = function(visibleBeatsOnly) {
      if (!visibleBeatsOnly && playbackState.beatsCounter >= beatsPerSlide) {
        playbackState.beatsCounter -= beatsPerSlide;
        playerSwiper.slideNext();
      }
    };

    $scope.player.playbackRangeChanged = function() {
      initPlaylistSlides();
    };

    $scope.$on('$destroy', function() {
      audioPlayer.un('playbackStopped', playbackStopped);
      projectManager.un('playlistLoaded', playlistLoaded);
      projectManager.un('projectLoaded', projectLoaded);
    });

    // window.sw = playerSwiper;
  }
})();
