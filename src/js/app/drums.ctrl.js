(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('DrumsController', DrumsController);

  function DrumsController($scope, $timeout, audioPlayer) {
    console.log('NOTE CONTROLLER');

    $scope.drums = [
      {
        label: 'Tom 1'
      }, {
        label: 'Tom 2'
      }, {
        label: 'Tom 3'
      }, {
        label: 'Hi-Hat'
      }, {
        label: 'Snare'
      }, {
        label: 'Kick'
      }
    ];

    var drumsData = [];
    var beat, subbeat;
    for (beat = 0; beat < $scope.bar.timeSignature.top; beat++) {
      for (subbeat = 0; subbeat < 4; subbeat++) {
        var list = new Array($scope.bass.strings);
        $scope.drums.forEach(function(drum, index) {
          list[index] = {
            beat: beat,
            subbeat: subbeat,
            drum: drum
          };
        });
        drumsData.push(list);
      }
    }

    $scope.drumsData =drumsData;


    $scope.playSound = function(sound) {
      audioPlayer.playSound(sound);
    };
  }

})();
