(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('FretboardController', FretboardController);

  function FretboardController($scope, audioPlayer) {
    
    $scope.fretboard = {
      style: 'finger',
      noteLength: {
        length: 1/8
      },
      size: 20
    };

    $scope.playBassSound = function(bassSound) {
      var sound = angular.extend({
        style: $scope.fretboard.style,
        noteLength: {
          beatLength: 1/2
        },
        volume: 0.75
      }, bassSound);
      audioPlayer.playBassSample(sound);
    };

  }

})();
