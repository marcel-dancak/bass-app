(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('PlayerController', PlayerController);

  function PlayerController($scope, $timeout, audioPlayer, projectManager, workspace, $mdCompiler) {
    $scope.selected = {section: null};

    workspace.track = projectManager.project.tracksMap['bass_0'];

    var playlist = angular.copy(projectManager.project.sections);
    playlist.forEach(function(section) {
      section.repeats = 1;
    });
    $scope.playlist = angular.copy(playlist);

    $scope.dropPlaylistSection = function(event, dragSectionIndex, dropSectionIndex, dropSection) {
      var dragSection = $scope.playlist[dragSectionIndex];

      // move dragged section item into dropped position
      $scope.playlist.splice(dropSectionIndex, 0, dragSection);
      var removeIndex = dragSectionIndex;
      if (dragSectionIndex > dropSectionIndex) {
        removeIndex += 1;
      }
      $scope.playlist.splice(removeIndex, 1);
    };

    $scope.playlistKeyPressed = function(evt) {
      console.log(evt);
      switch (evt.keyCode) {
        case 46: // Del
          if ($scope.selected.section) {
            var index = $scope.playlist.indexOf($scope.selected.section);
            console.log(index);
            $scope.playlist.splice(index, 1);
            $scope.selected.section = $scope.playlist[index];
            var nextItemElem = evt.target.nextElementSibling;
            if (nextItemElem) {
              $timeout(function() {
                nextItemElem.focus();
              });
            }
          }
      }
    };

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

    $timeout(function() {
      playlist = [
        projectManager.getSection(0),
        projectManager.getSection(17),
        projectManager.getSection(16),
        projectManager.getSection(17),
        projectManager.getSection(16),
        // projectManager.getSection(9)
      ];
      playlistSlidePosition = {
        section: 0,
        bar: 1,
        beat: 1
      };
      generateSlide(playlist, playlistSlidePosition, beatsPerSlide);
      generateSlide(playlist, playlistSlidePosition, beatsPerSlide);
      generateSlide(playlist, playlistSlidePosition, beatsPerSlide);
    }, 500);

    function beatSync(evt) {
      console.log(evt);
      var activeSlideElem = playerSwiper.slides[playerSwiper.activeIndex];

      var activeElems = activeSlideElem.querySelectorAll('.subbeat.active');
      for (var i = 0; i < activeElems.length; i++) {
        angular.element(activeElems[i]).removeClass('active');
      }

      var beatElem = activeSlideElem.querySelector('#beat_{0}_{1}'.format(evt.bar, evt.beat));
      if (beatElem) {
        beatElem = beatElem.children[0];
        angular.element(beatElem).addClass('active');
      }
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
      }
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
