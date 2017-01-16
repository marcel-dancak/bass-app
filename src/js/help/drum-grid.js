(function() {
  'use strict';

  angular
    .module('bd.help')
    .controller('DrumSounds', DrumSounds);


  function DrumSounds($scope, $element, $timeout) {

    var sound;
    var beat = $scope.workspace.trackSection.beat(1, 1);
    sound = {subbeat: 2, drum: 'kick', volume: 0.0};
    $scope.workspace.trackSection.addSound(beat, sound);

    $scope.instructions = [
      /* Create a first sound */
      function() {
        sound.volume = 0.85;
      },
      function() {
        sound.volume = 0.4;
      },
      function() {
        sound.volume = 0;
      },

      function() {},
      function() {
        var volumes = [0.1, 0.2, 0.3, 0.4];
        volumes.forEach(function(volume, index) {
          $timeout(function() {
            sound.volume = volume;
          }, (index+1)*200);
        });
      },
      function() {
        var volumes = [0.3, 0.2];
        volumes.forEach(function(volume, index) {
          $timeout(function() {
            sound.volume = volume;
          }, (index+1)*250);
        });
      },
      function() {
        sound.volume = 0;
      }
    ];
  }

})();