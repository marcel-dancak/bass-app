(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('DrumsController', DrumsController);

  function DrumsController($scope, $timeout, audioPlayer) {
    var drumsVolumeLevels = [0.0, 0.85, 0.4];

    $scope.drums = [
      {
        label: 'Tom 1',
        filename: 'sounds/drums/acoustic-kit/tom1',
        duration: 0.41
      }, {
        label: 'Tom 2',
        filename: 'sounds/drums/acoustic-kit/tom2',
        duration: 0.6
      }, {
        label: 'Tom 3',
        filename: 'sounds/drums/acoustic-kit/tom3',
        duration: 1.0
      }, {
        label: 'Hi-Hat',
        filename: 'sounds/drums/acoustic-kit/hihat',
        duration: 0.25
      }, {
        label: 'Snare',
        filename: 'sounds/drums/acoustic-kit/snare',
        duration: 0.36
      }, {
        label: 'Kick',
        filename: 'sounds/drums/acoustic-kit/kick',
        duration: 0.27
      }
    ];
    var resources = $scope.drums.map(function(drum) {
      return drum.filename;
    });
    audioPlayer.bufferLoader.loadResources(resources);

    var drumsData = $scope.drumsData;
    var beat, subbeat;
    for (beat = 0; beat < $scope.bar.timeSignature.top; beat++) {
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
  }

})();
