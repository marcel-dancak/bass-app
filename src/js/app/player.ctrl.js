(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('PlayerController', PlayerController);

  function PlayerController($scope, $timeout, audioPlayer, projectManager, workspace, $mdCompiler) {
    window.pm = projectManager;
    $scope.selected = {section: null};

    $scope.barLabels = {
      3: ['trip', 'let'],
      4: ['e', 'and', 'a']
    };

    projectManager.createProject([
      {
        type: 'bass',
        name: 'Bassline',
        strings: 'EADG',
        tuning: [0, 0, 0, 0]
      }, {
        type: 'drums',
        kit: 'Standard',
        name: 'Standard'
      }
    ]);
    workspace.track = projectManager.project.tracksMap['bass_0'];
    $scope.workspace = workspace;

    $timeout(function() {
      var playlist = angular.copy(projectManager.project.sections);
      playlist.forEach(function(section) {
        section.repeats = 1;
      });
      $scope.playlist = angular.copy(playlist);
    }, 400);

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


    function generateSlide(position, count) {
      var section = projectManager.getSection(position.section);
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
            section = projectManager.getSection(position.section);
            track = section.tracks['bass_0'];
          }
        }
      }

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
          generateSlide(playlistSlidePosition, beatsPerSlide);
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

    $timeout(function() {
      initializeSwiper();
      // playerSwiper.appendSlide('<div class="swiper-slide">Slide 1</div>');
      // playerSwiper.appendSlide('<div class="swiper-slide">Slide 2</div>');
      // playerSwiper.appendSlide('<div class="swiper-slide">Slide 3</div>');
      // playerSwiper.appendSlide('<div class="swiper-slide">Slide 4</div>');
      // playerSwiper.appendSlide('<div class="swiper-slide">Slide 5</div>');

      // playerSwiper.slideTo(1, 0, false);
    });

    var playlistSlidePosition = {
      section: 0,
      bar: 1,
      beat: 1
    };
    var beatsPerSlide = 5;

    $timeout(function() {
      generateSlide(playlistSlidePosition, beatsPerSlide);
      generateSlide(playlistSlidePosition, beatsPerSlide);
      generateSlide(playlistSlidePosition, beatsPerSlide);
      generateSlide(playlistSlidePosition, beatsPerSlide);
    }, 500);

    var playlist;
    $scope.player = {};
    $scope.play = function() {
      if (!playlist) {
        var s1 = projectManager.getSection(17);
        var s2 = projectManager.getSection(16);
        playlist = [
          s1, s2
        ].reverse();
      }
      $scope.player.playing = true;
      var section = playlist.pop();
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
      audioPlayer.play(section);
    };
    $scope.stop = function() {
      audioPlayer.stop();
    };

    audioPlayer.on('playbackStopped', function(evt) {
      if (playlist.length > 0) {
        $scope.play();
      } else {
        $scope.player.playing = false;
        playlist = null;
      }
    });

  }
})();
