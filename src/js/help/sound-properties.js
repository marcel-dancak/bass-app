(function() {
  'use strict';

  angular
    .module('bd.help')
    .controller('SoundPropertiesSlideshow', SoundPropertiesSlideshow)



  function SoundPropertiesSlideshow($scope, $element, $timeout, basicHandler, bassSoundForm, $mdCompiler) {

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
          style: 'finger',
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
          },
          volume: 0.75
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