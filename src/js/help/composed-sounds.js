(function() {
  'use strict';

  angular
    .module('bd.help')
    .controller('ComposedSounds', ComposedSounds);

  function ComposedSounds($scope, $element, $timeout, basicHandler) {

    $scope.instructions = [
      function() {
        $scope.workspace.addSound(1, 1, 2, {
          string: 'A',
          style: 'slap',
          note: {
            type: 'regular',
            name: 'C',
            octave: 2,
            fret: 3
          },
          noteLength: {
            length: 1/8,
            beatLength: 1/8
          }
        });
      },
      function() {
        $scope.workspace.addSound(1, 1, 4, {
          string: 'A',
          style: 'slap',
          note: {
            type: 'regular',
            name: 'D',
            octave: 2,
            fret: 5
          },
          noteLength: {
            length: 1/16,
            beatLength: 1/16
          }
        })
      },
      function() {
        var elem = angular.element(
          $element[0].querySelector('#bass_1_1_4_A .bass-sound-container')
        );
        var grid = elem.scope().grid;
        basicHandler.selectGrid(
          {target: elem[0]},
          grid
        );
      },
      function() {
        basicHandler.selected.grid.sound.style = 'hammer';
        basicHandler.soundStyleChanged('hammer');
        basicHandler.clearSelection();
      },
      function() {
        $scope.workspace.trackSection.clearBeat($scope.workspace.trackSection.beat(1, 1));
      }
    ];

  }

})();