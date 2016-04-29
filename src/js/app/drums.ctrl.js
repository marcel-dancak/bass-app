(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('DrumsController', DrumsController);

  function DrumsController($scope, $timeout, audioPlayer) {
    var drumsVolumeLevels = [0.0, 0.85, 0.4];

    var resources = $scope.drums.map(function(drum) {
      return drum.filename;
    });
    audioPlayer.bufferLoader.loadResources(resources);

    var drumsData = $scope.drumsData;
    var beat, subbeat;
    for (beat = 0; beat < 12; beat++) {
      for (subbeat = 0; subbeat < 4; subbeat++) {
        var list = new Array($scope.bass.strings);
        $scope.drums.forEach(function(drum, index) {
          list[index] = {
            beat: beat,
            subbeat: subbeat,
            drum: drum,
            volume: 0.0
          };
        });
        drumsData.push(list);
      }
    }

    $scope.toggleDrum = function(sound) {
      var index = drumsVolumeLevels.indexOf(sound.volume);
      var nextIndex = (index+1) % drumsVolumeLevels.length;
      sound.volume = drumsVolumeLevels[nextIndex];
    };

    $scope.playSound = function(sound) {
      audioPlayer.playSound(sound);
    };

    $scope.volumeControl = function(sound, delta) {
      sound.volume += delta;
      if (sound.volume < 0) {
        sound.volume = 0;
      } else if (sound.volume > 1) {
        sound.volume = 1;
      }
    };

    $scope.onDrop = function($event, $data, subbeat, drumsData) {
      subbeat.volume = $data.volume;

      if (angular.isDefined($data.beat) && $event.dataTransfer.dropEffect === "move") {
        var srcSubbeat = drumsData[$data.beat*4+$data.subbeat].find(function(s) {
          return s.drum.label === subbeat.drum.label;
        });
        srcSubbeat.volume = 0;
      }
    };

  }

})();
