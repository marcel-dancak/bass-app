(function() {
  'use strict';

  angular
    .module('bd.app')
    .factory('pianoEditor', pianoEditor)
    .controller('PianoController', PianoController)

    .component('pianoBeat', {
      scope: false,
      templateUrl: 'views/editor/piano_beat.html',
      bindings: {
        beat: '<',
        instrument: '<'
      },
      controller: 'PianoController as vm'
    });


  function pianoEditor(workspace, Notes, SoundSelector, ResizeHandler, DragHandler, soundAnimation, dragablePanel) {
    const selector = new SoundSelector();

    class PianoResizeHandler extends ResizeHandler {

      beforeResize(sound, info) {
        selector.select(sound);
      }

    }

    const pianoDragHandlerOpts = {

      validateDrop (dropInfo, dragSound) {
        const key = dropInfo.position;
        if (dropInfo.channel === 'instrument') {
          return key.octave === dragSound.note.octave && key.label[0] === dragSound.note.name;
        }
        return true;
      },

      updateDropSound (sound, beat, note) {
        // console.log('--- updateDropSound ---');
        const isFlat = sound.note.name[1] === '♭';
        sound.note.name = note.label[(isFlat && note.label[1])? 1 : 0];
        sound.note.octave = note.octave;
        sound.string = note.label[0] + note.octave;
      },

      afterDrop (evt, data) {
        selector.selectMultiple(data);
      }
    }

    function transpose(sound, step) {
      const piano = workspace.track.instrument;
      const index = piano.stringIndex(sound.note);
      const transposedNote = piano.notes.list[index + step];
      if (transposedNote) {
        if (sound.next) {
          transpose(workspace.trackSection.nextSound(sound), step);
        }
        sound.note.name = transposedNote.label[0];
        sound.note.octave = transposedNote.octave;
        sound.string = sound.note.name + sound.note.octave;
      }
      console.log(index)
    }

    function shiftLeft(sound) {
      if (sound.prev) {
        return;
      }
      let startTime;
      if (sound.start > 0) {
        startTime = sound.start - 1 / sound.beat.subdivision;
      } else {
        const prevBeat = workspace.trackSection.prevBeat(sound.beat);
        startTime = -1 / prevBeat.subdivision;
      }
      workspace.trackSection.setSoundStart(sound, startTime);
    }

    function shiftRight(sound) {
      if (sound.prev) {
        return;
      }
      const step = 1 / sound.beat.subdivision;
      workspace.trackSection.setSoundStart(sound, sound.start + step);
    }

    return {
      selector: selector,
      resizeHandler: new PianoResizeHandler(),
      dragHandler: DragHandler.create('piano', pianoDragHandlerOpts),
      keyPressed (evt) {
        const sound = selector.last;
        console.log(evt.key)
        if (sound) {
          switch (evt.key) {
            case 'Delete':
              selector.all.forEach(s => {
                if (s.elem) {
                  soundAnimation(s.elem[0]);
                }
                workspace.trackSection.deleteSound(s);
              });
              break;
            case 't':
              console.log(JSON.stringify(sound));
              const prevSound = workspace.trackSection.prevSound(sound);
              if (prevSound) {
                sound.prev = true;
                prevSound.next = true;
              }
              break;
            case 'l':
              if (sound.note.name.endsWith('♯')) {
                sound.note.name = Notes.toFlat(sound.note.name);
              } else if (sound.note.name.endsWith('♭')) {
                sound.note.name = Notes.toSharp(sound.note.name);
              }
              evt.preventDefault();
              return false;
            case '.':
              selector.all.forEach(sound => {
                sound.note.staccato = !sound.note.staccato;
              });
              break;
            case '-':
              selector.all.forEach(sound => {
                sound.volume = Math.max(0, parseFloat((sound.volume-0.05).toFixed(2)));
                console.log(sound.volume);
              });
              break;
            case '+':
              selector.all.forEach(sound => {
                sound.volume = Math.min(1.0, parseFloat((sound.volume+0.05).toFixed(2)));
                console.log(sound.volume);
              });
              break;
             case 'ArrowUp':
              selector.all.forEach(sound => {
                if (!sound.prev) {
                  transpose(sound, 1);
                }
              }, this);
              break;
             case 'ArrowDown':
              selector.all.forEach(sound => {
                if (!sound.prev) {
                  transpose(sound, -1);
                }
              });
              break;
            case 'ArrowLeft':
              if (evt.altKey) {
                workspace.trackSection.offsetSound(sound, -0.01);
              } else {
                selector.all.forEach(shiftLeft);
              }
              evt.preventDefault();
              break;
            case 'ArrowRight':
              if (evt.altKey) {
                workspace.trackSection.offsetSound(sound, 0.01);
              } else {
                selector.all.forEach(shiftRight);
              }
              evt.preventDefault();
              break;
            // just for debugging
            case 'n':
              const n = workspace.trackSection.nextSound(sound)
              console.log(n)
              break;
            case 'p':
              const prev = workspace.trackSection.prevSound(sound);
              if (prev) {
                console.log('OK');
              }
              break;
            case 'm':
              selector.all.forEach(sound => {
                if (sound.muted) {
                  sound.elem.removeClass('muted');
                  delete sound.muted;
                } else {
                  sound.muted = true;
                  sound.elem.addClass('muted');
                }
              });
              break;
            case 'a':
              if (evt.ctrlKey) {
                const sounds = [];
                workspace.trackSection.forEachSound(s => sounds.push(s));
                selector.selectMultiple(sounds);
                evt.preventDefault();
              }
              break;
            case 'd':
              console.log(sound);
              break;
            case 'i':
              // if (!this.chordsPanel || !this.chordsPanel.isAttached) {
                this.chordsPanel = dragablePanel.open({
                  id: 'chords-identify',
                  attachTo: document.body,
                  templateUrl: 'views/editor/chords.html',
                  controller: 'ChordIdentifier',
                  locals: {
                    selector: selector
                  }
                });
              // }
              break;
          }
          evt.preventDefault();
        }
      }
    };
  }

  function PianoController($scope, pianoEditor) {
    $scope.clickHandler = pianoEditor.selector;
    $scope.dragHandler = pianoEditor.dragHandler;
    $scope.resizeHandler = pianoEditor.resizeHandler;
  }

})();