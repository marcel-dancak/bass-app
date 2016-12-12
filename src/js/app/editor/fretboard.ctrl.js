(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('FretboardController', FretboardController);

  function FretboardController($scope, audioPlayer, workspace, fretboardViewer, $element) {

    $scope.playingStyles = [
      {
        name: 'finger',
        label: 'FINGER'
      }, {
        name: 'slap',
        label: 'SLAP'
      }, {
        name: 'pop',
        label: 'POP'
      }, {
        name: 'pick',
        label: 'PICK'
      }, {
        name: 'tap',
        label: 'TAP'
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

    $scope.modeChanged = function() {
      fretboardViewer.activate($scope.fretboard.chordMode? $element[0] : null);
    };
  }

})();
