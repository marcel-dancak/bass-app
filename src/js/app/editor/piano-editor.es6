(function() {
  'use strict';

  angular
    .module('bd.app')

    .factory('eventHandler', eventHandler)
    .factory('pianoDragHandler', pianoDragHandler)
    .factory('pianoResizeHandler', pianoResizeHandler)
    .controller('EditController', EditController);


  /***************** Private helper functions ******************/


  function soundContainerElem(elem) {
    var e = elem;
    var maxDepth = 10;
    while (e.className.indexOf("sound-container") === -1) {
      //console.log(e.className);
      e = e.parentElement;
      if (maxDepth-- === 0) {
        return null;
      };
    }
    return e;
  }


  function eventHandler(workspace, Notes) {
    return {
      selected: {},
      select: function(evt, sound) {
        console.log('selectSound');
        if (this.selected.element) {
          this.selected.element.classList.remove('selected');
        }
        var elem = soundContainerElem(evt.target);
        elem.classList.add('selected');
        this.selected.element = elem;
        this.selected.sound = sound;
      },
      keyPressed: function(evt) {
        var sound = this.selected.sound;
        console.log(evt.keyCode)
        if (sound) {
          switch (evt.keyCode) {
            case 46: // Del
              workspace.trackSection.deleteSound(sound);
              break;
            case 84: // t
              console.log(JSON.stringify(sound));
              var prevSound = workspace.trackSection.prevSound(sound);
              if (prevSound) {
                sound.prev = true;
                prevSound.next = true;
              }
              break;
            case 9: // Tab
              if (sound.note.name.endsWith('♯')) {
                sound.note.name = Notes.toFlat(sound.note.name);
              } else if (sound.note.name.endsWith('♭')) {
                sound.note.name = Notes.toSharp(sound.note.name);
              }
              evt.preventDefault();
              return false;
            case 190: // .
              sound.note.staccato = !sound.note.staccato;
              break;
            case 109: // -
              sound.volume = Math.max(0, parseFloat((sound.volume-0.05).toFixed(2)));
              console.log(sound.volume);
              break;
            case 107: // +
              sound.volume = Math.min(1.0, parseFloat((sound.volume+0.05).toFixed(2)));
              console.log(sound.volume);
              break;
            case 37: // left
              workspace.trackSection.offsetSound(sound, -0.01);
              break;
            case 39: // right
              workspace.trackSection.offsetSound(sound, 0.01);
              break;

            // just for debugging
            case 78: // n
              var n = workspace.trackSection.nextSound(sound)
              console.log(n)
              break;
            case 80: // p
              var prev = workspace.trackSection.prevSound(sound);
              if (prev) {
                console.log('OK');
              }
              break;
          }
        }
      }
    }
  }



  function pianoResizeHandler(ResizeHandler, eventHandler) {
    class PianoResizeHandler extends ResizeHandler {

      beforeResize(sound, info) {
        eventHandler.select({target: info.element[0]}, sound);
        eventHandler.selected.element.appendChild(this.resizeBox.elem);
      }

    }
    return new PianoResizeHandler();
  }


  function pianoDragHandler(workspace, DragHandler, eventHandler) {
    class PianoDragHandler extends DragHandler {

      validateDrop(beat, key) {
        if (this.dragChannel === 'instrument') {
          return key.octave === this.dragSound.note.octave && key.label[0] === this.dragSound.note.name;
        }
        return true;
      }

      updateDropSound(sound, beat, note) {
        // console.log('--- updateDropSound ---');
        var isFlat = sound.note.name[1] === '♭';
        sound.note.name = note.label[(isFlat && note.label[1])? 1 : 0];
        sound.note.octave = note.octave;
        sound.string = note.label[0] + note.octave;
      }

      onDragStart(evt) {
        if (this.dragChannel !== 'instrument') {
          eventHandler.select(evt, this.dragSound);
        }
      }

      onDragEnd(evt, sound) {
        eventHandler.select(evt, sound);
      }

    }
    return new PianoDragHandler('piano');
  }

  function EditController($scope, eventHandler, pianoDragHandler, pianoResizeHandler) {
    $scope.eventHandler = eventHandler;
    $scope.dragHandler = pianoDragHandler;
    $scope.resizeHandler = pianoResizeHandler;
  }

})();