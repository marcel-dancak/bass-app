(function() {
  'use strict';

  angular
    .module('bd.help')
    .controller('ResizeSlideshow', ResizeSlideshow);


  function ResizeSlideshow($scope, $element, $timeout, basicHandler, resizeHandler) {

    var editGrid, editElem;

    function startResize(bar, beat, subbeat, string) {
      var selector = '#bass_{0}_{1}_{2}_{3} .bass-sound-container'.format(bar, beat, subbeat, string);
      editElem = angular.element($element[0].querySelector(selector));
      editGrid = editElem.scope().grid;
      editElem.addClass('hover');
      resizeHandler.onResizeStart(
        editGrid,
        {element: editElem, width: editElem[0].offsetWidth},
        4
      );
    }
    function resizeTo(factor) {
      var startWidth = editElem[0].clientWidth;
      var endWidth = startWidth * factor;
      resizeHandler.onResize(
        editGrid,
        {element: editElem, width: endWidth}
      );
    }
    function finishResize() {
      // timeout is used for nicer animation
      $timeout(function() {
        resizeHandler.onResizeEnd(
          editGrid,
          {element: editElem},
          {stopPropagation: angular.noop}
        );
      });
    }

    $scope.instructions = [
      /* Create sounds */
      function() {
        $scope.workspace.addSound(1, 1, 2, {
          string: 'A',
          style: 'slap',
          note: {
            type: 'regular',
            name: 'B',
            octave: 1,
            fret: 2
          },
          noteLength: {
            length: 1/16,
            beatLength: 1/16
          }
        });
        $scope.workspace.addSound(1, 2, 2, {
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
        $scope.workspace.addSound(1, 2, 3, {
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
        });
      },
      function() {
        startResize(1, 1, 2, 'A');
      },
      function() {
        resizeTo(3);
      },
      function() {
        finishResize();
      },
      /* Combine two sounds into the slide */
      function() {
        basicHandler.clearSelection();
        editElem.removeClass('hover');
      },
      function() {
        startResize(1, 2, 2, 'A');
      },
      function() {
        resizeTo(2);
      },
      function() {
        finishResize();
      },
      /* Clear bass sheet */
      function() {
        basicHandler.clearSelection();
        $scope.workspace.trackSection.clearBeat($scope.workspace.trackSection.beat(1, 1));
        $scope.workspace.trackSection.clearBeat($scope.workspace.trackSection.beat(1, 2));
      }
    ];
  }

})();