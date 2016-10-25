(function() {
  'use strict';

  angular
    .module('bd.help')
    .controller('SlidesSounds', SlidesSounds);


  function SlidesSounds($scope, $element, $timeout, basicHandler, resizeHandler) {

    var editGrid, editElem;

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
            length: 1/16,
            beatLength: 1/16
          }
        });
      },
      function() {
        $scope.workspace.addSound(1, 1, 3, {
          string: 'A',
          style: 'slap',
          note: {
            type: 'regular',
            name: 'E',
            octave: 2,
            fret: 7
          },
          noteLength: {
            length: 1/16,
            beatLength: 1/16
          }
        })
      },
      function() {
        editElem = angular.element(
          $element[0].querySelector('#bass_1_1_2_A .bass-sound-container')
        );
        editGrid = editElem.scope().grid;
        editElem.addClass('hover');
        resizeHandler.onResizeStart(
          editGrid,
          {element: editElem, width: editElem[0].offsetWidth},
          4
        );
        resizeHandler.onResize(
          editGrid,
          {element: editElem, width: editElem[0].offsetWidth}
        );
      },
      function() {
        var startWidth = editElem[0].clientWidth;
        var endWidth = startWidth * 2;
        var bbox = editElem[0].getBoundingClientRect();
        console.log(bbox.right);
        for (var i = 0; i < 10; i++) {
          var resizeWidth = startWidth + (endWidth - startWidth) * i/10;

          // $timeout(function(width) {
          // }, 150*i, true, resizeWidth);

        }
        resizeHandler.onResize(
          editGrid,
          {element: editElem, width: endWidth}
        );
      },
      function() {
        resizeHandler.onResizeEnd(
          editGrid,
          {element: editElem},
          {stopPropagation: angular.noop}
        );
      },
      function() {
        basicHandler.clearSelection();
        $scope.workspace.trackSection.clearBeat($scope.workspace.trackSection.beat(1, 1));
      }
    ];
  }

})();