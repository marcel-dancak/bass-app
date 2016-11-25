(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('FretboardController', FretboardController);

  function FretboardController($scope, audioPlayer, workspace) {

    $scope.playingStyles = [
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
      }
    ];

    $scope.fretboard = {
      style: 'finger',
      noteLength: {
        length: 1/8
      },
      size: 19
    };

    $scope.playBassSound = function(bassSound) {
      var sound = angular.extend({
        style: $scope.fretboard.style,
        noteLength: {
          beatLength: 1/2
        },
        volume: 0.75
      }, bassSound);
      audioPlayer.playBassSample(workspace.track, sound);
    };

  }

})();
