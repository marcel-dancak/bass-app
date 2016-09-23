(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('PlaylistViewer', PlaylistViewer);

  function PlaylistViewer($scope, $timeout, audioPlayer, projectManager, workspace, $mdCompiler, HighlightTimeline) {

    $scope.selected = {section: null};

    workspace.track = projectManager.project.tracksMap['bass_0'];

    $scope.visibleSubbeats = {
      3: {
        1: true,
        2: true,
        3: true,
        4: false
      }, 4:{
        1: true,
        2: true,
        3: true,
        4: true
      }
    };


    function generateSlide(playlist, position, count) {
      console.log('generateSlide');
      console.log(position);
      var section = playlist[position.section];
      if (!section) {
        console.log('end');
        return;
      }
      console.log(section);
      var beats = [];

      var track = section.tracks['bass_0'];
      while (count--) {
        var sectionFirstsBeat = position.bar === 1 && position.beat === 1;
        if (sectionFirstsBeat) {
          beats.push({
            sectionInfo: section,
          });
          // count--;
        }
        var trackBeat = track.beat(position.bar, position.beat);
        beats.push({
          bar: position.bar,
          beat: position.beat,
          subdivision: trackBeat.subdivision,
          sounds: track.beatSounds(trackBeat),
          subbeats: [1, 2, 3, 4]
        });
        if (sectionFirstsBeat) {
          beats[beats.length-1].label = section.name;
        }
        position.beat++;
        if (position.beat > section.timeSignature.top) {
          position.beat = 1;
          position.bar++;
          if (position.bar > section.length) {
            position.bar = 1;
            position.section++;
            console.log('section index: '+position.section);
            section = playlist[position.section];
            if (!section) break;
            track = section.tracks['bass_0'];
          }
        }
      }
      console.log(position);

      var scope = $scope.$new(false);
      scope.beats = beats;

      $mdCompiler.compile({
        templateUrl: 'views/playlist_slide.html'
      }).then(function(compileData) {
        //attach controller & scope to element
        var slideElement = compileData.link(scope);
        playerSwiper.appendSlide(slideElement);
        $timeout(function() {
          scope.$destroy();
        });
      });
    }

    var playerSwiper;

    var timeline = new HighlightTimeline({
      getBeatElem: function(bar, beat) {
        var slideElem = playerSwiper.slides[playerSwiper.activeIndex];
        var beatElem = slideElem.querySelector('#beat_{0}_{1}'.format(bar, beat));

        if (!beatElem) {
          slideElem = playerSwiper.slides[playerSwiper.activeIndex+1];
          beatElem = slideElem.querySelector('#beat_{0}_{1}'.format(bar, beat));
        }
        return beatElem;
      },
      getBarWrapper: function() {
        return playerSwiper.wrapper[0];
      }
    });

    function initializeSwiper() {
      var swiperElem = document.querySelector('.player.swiper-container');
      playerSwiper = new Swiper(swiperElem, {
        spaceBetween: 30,
        direction: 'vertical',
        slidesPerView: 2,
        slidesPerColumn: 1,
        initialSlide: 0,
        roundLengths: true
      });
      window.sw = playerSwiper;

      playerSwiper.on('transitionEnd', function(s) {
        console.log('activeIndex: {0} slides: {1}'.format(s.activeIndex, s.slides.length));
        if (s.slides.length - s.activeIndex <=  3 ) {
          console.log('generate NEXT slide');
          generateSlide(playlist, playlistSlidePosition, beatsPerSlide);
        }
        if (s.activeIndex > 1) {
          // angular.element(s.slides[0]).scope().$destroy();
          s.removeSlide(0);
        }
      });

      playerSwiper.on('onSlidePrevEnd', function(s) {
        console.log('prev');
        // s.prependSlide('<div class="swiper-slide">Slide </div>');
        // s.removeSlide(s.slides.length-1);
      });
      playerSwiper.on('onSlideNextEnd', function(s) {
        console.log('next');
         //s.appendSlide('<div class="swiper-slide">Slide </div>');
         //s.removeSlide(0);
      });
    }

    initializeSwiper();

    var playlist;
    var playlistSlidePosition;
    var beatsPerSlide = 8;
    var playbackState = {
      section: 0,
      beatsCounter: 0
    };


    playlist = projectManager.project.playlists[0].map(function(item) {
      return projectManager.getSection(item.id);
    });

    playlistSlidePosition = {
      section: 0,
      bar: 1,
      beat: 1
    };
    generateSlide(playlist, playlistSlidePosition, beatsPerSlide);
    generateSlide(playlist, playlistSlidePosition, beatsPerSlide);
    generateSlide(playlist, playlistSlidePosition, beatsPerSlide);

    function beatSync(evt) {
      console.log(evt);
      timeline.beatSync(evt);

      playbackState.beatsCounter++;
      if (playbackState.beatsCounter > beatsPerSlide) {
        playbackState.beatsCounter = 0;
        playerSwiper.slideNext();
      }
    }

    $scope.player.play = function() {
      $scope.player.playing = true;
      var section = playlist[playbackState.section];
      console.log(playlist);
      console.log(playbackState);
      audioPlayer.setBpm(section.bpm);

      audioPlayer.playbackRange = {
        start: {
          bar: 1,
          beat: 1
        },
        end: {
          bar: section.length,
          beat: section.timeSignature.top
        }
      };
      timeline.start();
      audioPlayer.play(section, beatSync);
    };
    $scope.player.stop = function() {
      playbackState.section = playlist.length;
      audioPlayer.stop();
    };

    function playbackStopped(evt) {
      playbackState.section++;
      if (playbackState.section < playlist.length) {
        $scope.player.play();
      } else {
        timeline.stop();
        playbackState.section = 0;
        $scope.player.playing = false;
      }
    }

    audioPlayer.on('playbackStopped', playbackStopped);

    $scope.$on('$destroy', function() {
      audioPlayer.un('playbackStopped', playbackStopped);
    });

  }
})();
