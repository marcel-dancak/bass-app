(function() {
  'use strict';

  angular
    .module('bd.help')
    .controller('ComposedSounds', ComposedSounds);

  function ComposedSounds($scope, $element, $timeout, basicHandler) {

    $scope.instructions = [
      function() {
        $scope.workspace.trackSection.addSound(
          $scope.workspace.trackSection.beat(1, 1),
          {
            start: 0.25,
            string: 'A',
            style: 'slap',
            note: {
              type: 'regular',
              name: 'C',
              octave: 2,
              fret: 3,
              length: 8,
            }
          }
        );
      },
      function() {
        $scope.workspace.trackSection.addSound(
          $scope.workspace.trackSection.beat(1, 1),
          {
            start: 0.75,
            string: 'A',
            style: 'slap',
            note: {
              type: 'regular',
              name: 'D',
              octave: 2,
              fret: 5,
              length: 16,
            }
          }
        );
      },
      function() {
        var elem = $element[0].querySelectorAll('.sound-container')[1];
        var sound = angular.element(elem).scope().sound;
        basicHandler.selectSound({target: elem}, sound);
      },
      function() {
        basicHandler.selected.sound.style = 'hammer';
        basicHandler.soundStyleChanged('hammer');
        basicHandler.clearSelection();
      },
      function() {
        $scope.workspace.trackSection.clearBeat($scope.workspace.trackSection.beat(1, 1));
      }
    ];

  }

})();