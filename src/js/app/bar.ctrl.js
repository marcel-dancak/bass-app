(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('BarController', BarController);

  function BarController($scope, $timeout) {

    $scope.setBeatSubdivision = function(barBeat, bassBeat, subdivision) {
      console.log(barBeat);
      console.log(bassBeat);
      bassBeat.subdivision = subdivision;
      if (subdivision === 3) {
        barBeat.subbeats.splice(1, barBeat.subbeats.length-1, 'trip', 'let');
        barBeat.visibleSubbeats = [1, 2, 3];
        bassBeat.visibleSubbeats = [1, 2, 3];
      } else {
        barBeat.subbeats.splice(1, barBeat.subbeats.length-1, 'e', 'and', 'a');
        updateSubbeatsVisibility();
      }
    };

    $scope.openBeatMenu = function(openFunction, evt) {
      var parentBox = evt.target.offsetParent.getBoundingClientRect();
      var offsetElem = evt.target.getElementsByTagName("offset")[0];
      offsetElem.style.left = (evt.clientX-parentBox.left)+'px';
      offsetElem.style.top = (evt.clientY-parentBox.top)+'px';
      $timeout(openFunction, 20, true, evt);
    };

    var bassClipboard = [];
    var drumsClipboard = [];
    $scope.copyBar = function(barIndex) {
      console.log('Copy bar: '+barIndex);
      var section = $scope.section;

      bassClipboard.splice(0, bassClipboard.length);
      drumsClipboard.splice(0, drumsClipboard.length);
      var beatIndex;
      for (beatIndex = 1; beatIndex <= section.timeSignature.top; beatIndex++) {
        var bassBeat = section.bassBeat(barIndex, beatIndex);
        bassClipboard.push({
          beat: beatIndex,
          subdivision: bassBeat.subdivision,
          sounds: section.getBassSounds(bassBeat)
        });
        var drumsBeat = section.drumsBeat(barIndex, beatIndex);
        drumsClipboard.push({
          beat: beatIndex,
          subdivision: drumsBeat.subdivision,
          sounds: section.getDrumsSounds(drumsBeat)
        });
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

    $scope.bassClipboard = bassClipboard;
    $scope.drumsClipboard = drumsClipboard;
  }
})();