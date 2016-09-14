(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('DrumsController', DrumsController);

  function DrumsController($scope, $timeout, audioPlayer, workspace) {
    var drumsVolumeLevels = [0.0, 0.85, 0.4];

    $scope.toggleDrum = function(sound) {
      var index = drumsVolumeLevels.indexOf(sound.volume);
      var nextIndex = (index+1) % drumsVolumeLevels.length;
      sound.volume = drumsVolumeLevels[nextIndex];
    };

    $scope.playSound = function(sound) {
      audioPlayer.playDrumSample(sound);
    };

    $scope.volumeControl = function(sound, delta) {
      sound.volume += delta;
      if (sound.volume < 0) {
        sound.volume = 0;
      } else if (sound.volume > 1) {
        sound.volume = 1;
      }
    };

    $scope.onDrop = function($event, data, subbeat) {
      subbeat.volume = data.sound.volume;
      if (angular.isDefined(data.beat) && $event.dataTransfer.dropEffect === "move") {
        var srcSubbeat = workspace.trackSection.subbeat(data.bar, data.beat, data.subbeat);
        srcSubbeat[data.index].volume = 0;
      }
    };

  }

})();
