(function() {
  'use strict';

  angular
    .module('bd.help')
    .controller('SlidesSounds', SlidesSounds)
    .controller('SoundForm', SoundForm)


  function SlidesSounds($scope, $element, $timeout, basicHandler, resizeHandler) {

    var editGrid, editElem;

    $scope.instructions = [
      /* Create a first sound */
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
      /* Create a second sound */
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
      /* Start resize operation */
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
      /* Resize to overlap with second sound (double size) */
      function() {
        var startWidth = editElem[0].clientWidth;
        var endWidth = startWidth * 2;
        resizeHandler.onResize(
          editGrid,
          {element: editElem, width: endWidth}
        );
      },
      /* Finish resize operation - slide sound will be created */
      function() {
        // timeout is used for nicer animation
        $timeout(function() {
          resizeHandler.onResizeEnd(
            editGrid,
            {element: editElem},
            {stopPropagation: angular.noop}
          );
        });
      },
      /* Clear bass sheet */
      function() {
        basicHandler.clearSelection();
        $scope.workspace.trackSection.clearBeat($scope.workspace.trackSection.beat(1, 1));
      }
    ];
  }

  function SoundForm($scope, $element, $timeout, basicHandler, bassSoundForm, $mdCompiler) {

    var editGrid, editElem, form, formScope;

    var bass = {
      playingStyles: [
        {
          name: 'finger',
          label: 'Finger'
        }, {
          name: 'slap',
          label: 'Slap'
        }, {
          name: 'pop',
          label: 'Pop'
        }, {
          name: 'pick',
          label: 'Pick'
        }, {
          name: 'tap',
          label: 'Tap'
        }, {
          name: 'hammer',
          label: 'Hammer-On'
        }, {
          name: 'pull',
          label: 'Pull-Off'
        }, {
          name: 'ring',
          label: 'Let ring'
        }
      ]
    };

    $scope.instructions = [
      /* Create a first sound */
      function() {
        $scope.workspace.addSound(1, 1, 2, {
          string: 'G',
          style: 'pop',
          note: {
            type: 'regular',
            name: 'A',
            octave: 2,
            code: 'A2',
            fret: 2
          },
          noteLength: {
            length: 1/16,
            beatLength: 1/16
          }
        });
      },
      /* Create a second sound */
      function() {
        editElem = angular.element(
          $element[0].querySelector('#bass_1_1_2_G .bass-sound-container')
        );
        editGrid = editElem.scope().grid;

        form = bassSoundForm.open(
          {target: editElem[0]},
          editGrid,
          bass,
          {
            clickOutsideToClose: false,
            escapeToClose: false,
            // attachTo: angular.element(document.querySelector('.help-container .content')),
            attachTo: $element.parent(),
            panelClass: 'non-interactive bass-form'
          }
        );
      },
      function() {
        formScope = angular.element(document.querySelector('.bass-sound-form')).scope();
        editGrid.sound.noteLength.dotted = true;
        formScope.soundLengthChanged(editGrid.sound);
      },
      function() {
        editGrid.sound.noteLength.staccato = true;
      },

      /* Clear bass sheet */
      function() {
        if (form) {
          form.close();
          form = null;
        }
        basicHandler.clearSelection();
        $scope.workspace.trackSection.clearBeat($scope.workspace.trackSection.beat(1, 1));
      }
    ];
  }

})();