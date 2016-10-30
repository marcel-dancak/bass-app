(function() {
  'use strict';

  angular
    .module('bd.help')
    .controller('DrumSounds', DrumSounds);


  function DrumSounds($scope, $element, $timeout) {

    $scope.instructions = [
      /* Create a first sound */
      function() {
        $scope.workspace.addSound(1, 1, 2, '2', 0.85);
      },

      function() {
        $scope.workspace.addSound(1, 1, 2, '2', 0.4);
      },
      function() {
        $scope.workspace.addSound(1, 1, 2, '2', 0);
      },

      function() {},
      function() {
        var volumes = [0.1, 0.2, 0.3, 0.4];
        volumes.forEach(function(volume, index) {
          $timeout(function() {
            $scope.workspace.addSound(1, 1, 2, '2', volume);
          }, (index+1)*200);
        });
      },
      function() {
        var volumes = [0.3, 0.2];
        volumes.forEach(function(volume, index) {
          $timeout(function() {
            $scope.workspace.addSound(1, 1, 2, '2', volume);
          }, (index+1)*250);
        });
      },
      function() {
        $scope.workspace.addSound(1, 1, 2, '2', 0);
      }
    ];
  }

})();