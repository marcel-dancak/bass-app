(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('BarController', BarController);

  function BarController($scope, $timeout) {

    $scope.openBeatMenu = function(openFunction, evt) {
      var parentBox = evt.target.offsetParent.getBoundingClientRect();
      var offsetElem = evt.target.getElementsByTagName("offset")[0];
      offsetElem.style.left = (evt.clientX-parentBox.left)+'px';
      offsetElem.style.top = (evt.clientY-parentBox.top)+'px';
      $timeout(openFunction, 20, true, evt);
    };

    var bassClipboard = [];
    var drumsClipboard = [];
    $scope.copyBar = function(barIndex, instrument) {
      console.log('Copy bar: '+barIndex+' : '+instrument);
      var section = $scope.section;

      bassClipboard.splice(0, bassClipboard.length);
      drumsClipboard.splice(0, drumsClipboard.length);
      var beatIndex;
      for (beatIndex = 1; beatIndex <= section.timeSignature.top; beatIndex++) {
        if (instrument === 'bass') {
          var bassBeat = section.bassBeat(barIndex, beatIndex);
          bassClipboard.push({
            beat: beatIndex,
            subdivision: bassBeat.subdivision,
            sounds: section.getBassSounds(bassBeat)
          });
        }
        if (instrument === 'drums') {
          var drumsBeat = section.drumsBeat(barIndex, beatIndex);
          drumsClipboard.push({
            beat: beatIndex,
            subdivision: drumsBeat.subdivision,
            sounds: section.getDrumsSounds(drumsBeat)
          });
        }
      }
    };

    $scope.pasteBar = function(barIndex) {
      console.log('Paste bar: '+barIndex);
      var section = $scope.section;

      // paste bass sounds
      bassClipboard.forEach(function(beat) {
        var destBassBeat = section.bassBeat(barIndex, beat.beat);
        if (beat.subdivision !== destBassBeat.subdivision) {
          var flatIndex = (barIndex-1)*section.timeSignature.top+beat.beat-1;
          var barBeat = $scope.slides.bars[flatIndex];
          $scope.setBeatSubdivision(barBeat, destBassBeat, beat.subdivision);
        }
        beat.sounds.forEach(function(bassSound) {
          var subbeat = $scope.section.bassSubbeat(barIndex, beat.beat, bassSound.subbeat);
          angular.extend(subbeat[bassSound.sound.string].sound, bassSound.sound);
        });
      });

      // paste drum sounds
      drumsClipboard.forEach(function(beat) {
        beat.sounds.forEach(function(drumSound) {
          var subbeat = $scope.section.drumsSubbeat(barIndex, beat.beat, drumSound.subbeat);
          subbeat[drumSound.drum].volume = drumSound.volume;
        });
      });
      // bassClipboard.splice(0, bassClipboard.length);
      // drumsClipboard.splice(0, drumsClipboard.length);
    };

    $scope.clearBar = function(barIndex) {
      var bar = $scope.section.bars[barIndex-1];
      bar.bassBeats.forEach(function(bassBeat) {
        $scope.section.clearBassBeat(bassBeat);
      });
      bar.drumsBeats.forEach(function(drumsBeat) {
        $scope.section.clearDrumsBeat(drumsBeat);
      });
    };

    $scope.bassClipboard = bassClipboard;
    $scope.drumsClipboard = drumsClipboard;
  }
})();