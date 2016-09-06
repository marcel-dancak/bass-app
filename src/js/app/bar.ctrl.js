(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('BarController', BarController);

  function BarController($scope, $timeout, workspace) {

    $scope.contextMenu = {
      show: angular.noop,
      element: null,
      beat: null
    };


    $scope.contextMenu.open = function(evt, index) {
      console.log('openBeatMenu');
      if (!$scope.contextMenu.element) {
        $scope.contextMenu.element = document.querySelector('.beat-menu');
      }
      $scope.contextMenu.beat = $scope.slides[index].beat;
      console.log($scope.contextMenu);

      var parentBox = evt.target.getBoundingClientRect();

      $scope.contextMenu.element.style.position = 'fixed';
      $scope.contextMenu.element.style.left = parentBox.left+'px';
      $scope.contextMenu.element.style.top = parentBox.top+'px';
      $scope.contextMenu.element.style.width = parentBox.width+'px';
      $scope.contextMenu.element.style.height = (parentBox.height-2)+'px';

      var offsetElem = $scope.contextMenu.element.getElementsByTagName("offset")[0];
      offsetElem.style.left = (evt.clientX-parentBox.left)+'px';
      offsetElem.style.top = (evt.clientY-parentBox.top)+'px';

      $timeout(function() {
        $scope.contextMenu.element.children[0].click();
      });
    };

    $scope.setBeatSubdivision = function() {

    };

    var clipboard = [];
    $scope.copyBar = function(barIndex, instrument) {
      console.log('Copy bar: '+barIndex+' : '+instrument);
      var section = $scope.section;

      clipboard.splice(0, clipboard.length);
      var beatIndex;
      for (beatIndex = 1; beatIndex <= workspace.section.timeSignature.top; beatIndex++) {
        var beat = workspace.trackSection.beat(barIndex, beatIndex);
        clipboard.push({
          bar: barIndex,
          beat: beatIndex,
          subdivision: bassBeat.subdivision,
          sounds: workspace.trackSection.getSounds(beat)
        });
      }
    };

    $scope.pasteBar = function(barIndex) {
      console.log('Paste bar: '+barIndex);
      var section = $scope.section;

      var barOffset = barIndex - clipboard[0].bar;
      // paste bass sounds
      clipboard.forEach(function(beat) {
        // var destBassBeat = section.bassBeat(barIndex, beat.beat);
        // if (beat.subdivision !== destBassBeat.subdivision) {
        //   var flatIndex = (barIndex-1)*section.timeSignature.top+beat.beat-1;
        //   var barBeat = $scope.slides.bars[flatIndex];
        //   $scope.setBeatSubdivision(barBeat, destBassBeat, beat.subdivision);
        // }
        // beat.sounds.forEach(function(bassSound) {
        //   var subbeat = $scope.section.bassSubbeat(barIndex, beat.beat, bassSound.subbeat);
        //   var destSound = subbeat[bassSound.sound.string.label].sound;
        //   angular.extend(destSound, angular.copy(bassSound.sound));
        //   if (destSound.next) {
        //     destSound.next.bar += barOffset;
        //     delete destSound.next.ref;
        //   }
        //   if (destSound.prev) {
        //     destSound.prev.bar += barOffset;
        //     delete destSound.prev.ref;
        //   }
        // });
        // section.updateBassReferences(destBassBeat);
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

    $scope.clearBar = function(barIndex, instrument) {
      var bar = $scope.section.bars[barIndex-1];
      if (instrument === 'bass') {
        bar.bassBeats.forEach(function(bassBeat) {
          $scope.section.clearBeat(bassBeat);
        });
      }
      if (instrument === 'drums') {
        bar.drumsBeats.forEach(function(drumsBeat) {
          $scope.section.clearBeat(drumsBeat);
        });
      }
    };
  }
})();