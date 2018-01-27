(function() {
  'use strict';

  angular
    .module('bd.app')
    .factory('bassEditor', bassEditor)

  /***************** Private helper functions ******************/

  function bassEditor(workspace, Notes, SoundSelector, DragHandler, ResizeHandler, soundAnimation) {
    var selector = new SoundSelector();

    var bassDragHandlerOpts = {

      validateDrop (dropInfo, sound) {
        var string = dropInfo.position;
        if (sound.note.type === 'ghost') {
          return true;
        }
        var fret = workspace.track.instrument.stringFret(string.label, sound.note);
        return fret >= 0;
      },

      updateDropSound (sound, beat, string) {
        sound.string = string.label;
        if (sound.note.type !== 'ghost') {
          sound.note.fret = workspace.track.instrument.stringFret(string.label, sound.note);
        }
        if (sound.endNote) {
          sound.endNote.fret = workspace.track.instrument.stringFret(
            string.label, sound.endNote
          );
        }
      },

      afterDrop (evt, data) {
        selector.selectMultiple(data);
      }
    }

    function getSoundGrid(evt, beat) {
      var container = evt.target.parentElement;

      var box = container.getBoundingClientRect();
      var x = evt.clientX - box.left;
      var y = evt.clientY - box.top;

      var subbeat = 1 + parseInt((x * beat.subdivision) / box.width);
      var stringIndex = workspace.track.instrument.strings.length - 1 - parseInt(y / 36);
      var string = workspace.track.instrument.strings[stringIndex];

      return {
        subbeat: subbeat,
        string: string,
        containerElem: container
      };
    }

    function roundFloat(value) {
      return parseFloat((value).toFixed(2))
    }


    class BassResizeHandler extends ResizeHandler {

      beforeResize (sound, info) {
        console.log('bass beforeResize');
      }

      afterResize (sound, info) {
        function barPosition(beat, value) {
          return (beat.bar - 1 ) * workspace.section.timeSignature.top + beat.beat - 1 + value;
        }
        var endPosition = barPosition(sound.beat, sound.end);
        var beat = sound.beat;
        var overlappingSound;


        var sounds = [].concat(workspace.trackSection.beatSounds(beat));
        while (beat && barPosition(beat, 1) < endPosition) {
          beat = workspace.trackSection.nextBeat(beat);
          Array.prototype.push.apply(sounds, workspace.trackSection.beatSounds(beat));
        }

        for (var i = 0; i < sounds.length; i++) {
          var s = sounds[i];
          if (s !== sound && s.string === sound.string && barPosition(s.beat, s.start) < endPosition && barPosition(s.beat, s.end) >= endPosition) {
            overlappingSound = s;
            break;
          }
        }
        if (overlappingSound && !overlappingSound.next && overlappingSound.note && overlappingSound.note.type === 'regular') {
          sound.note.type = 'slide';
          sound.endNote = angular.copy(overlappingSound.note);
          sound.note.slide = {};

          workspace.trackSection.deleteSound(overlappingSound);
        }
      }
    }

    return {
      selector: selector,
      dragHandler: DragHandler.create('bass', bassDragHandlerOpts),
      resizeHandler: new BassResizeHandler(),
      createSound (evt, beat) {
        var position = getSoundGrid(evt, beat);
        var sound = {
          string: position.string.label,
          style: 'finger',
          volume: 0.75,
          start: (position.subbeat-1) / beat.subdivision,
          note: {
            type: 'regular',
            name: position.string.notes[0].label[0],
            octave: position.string.notes[0].octave,
            fret: 0,
            length: 16
          }
        };
        workspace.trackSection.addSound(beat, sound);
        return sound;
      },
      soundStyleChanged (sound) {
        var style = sound.style;
        if (style === 'hammer' || style === 'pull' || style === 'ring') {
          var soundOnLeft = workspace.trackSection.prevSound(sound);
          if (soundOnLeft && soundOnLeft.note) {
            soundOnLeft.next = true;
            sound.prev = true;

            if (style === 'ring') {
              var ringNote = sound.note;
              var prevNote = soundOnLeft.endNote || soundOnLeft.note;
              var fretOffset = sound.note.fret - prevNote.fret;
              if (fretOffset === 0) {
                angular.merge(sound.note, {
                  type: 'regular',
                  fret: prevNote.fret,
                  name: prevNote.name,
                  octave: prevNote.octave,
                });
              } else {
                sound.note = {
                  type: 'slide',
                  fret: prevNote.fret,
                  name: prevNote.name,
                  octave: prevNote.octave,
                  length: ringNote.length,
                  dotted: ringNote.dotted,
                  slide: {
                    start: 0.05,
                    end: 0.85
                  }
                };
                sound.endNote = {
                  fret: ringNote.fret,
                  name: ringNote.name,
                  octave: ringNote.octave
                }
              }
            }
          } else {
            sound.style = 'finger';
          }
        } else {
          if (sound.prev) {
            delete workspace.trackSection.prevSound(sound).next;
            delete sound.prev;
          }
        }
      },

      noteTypeChanged (sound) {
        var type = sound.note.type;
        if (sound.endNote && type !== 'slide' && type !== 'grace') {
          delete sound.endNote;
        }
      },

      soundLabelChanged (sound) {
        while (sound.next) {
          var nextSound = workspace.trackSection.nextSound(sound);
          if (nextSound.style === 'hammer' || nextSound.style === 'pull') {
            break;
          }
          var endNote = sound.endNote || sound.note;
          nextSound.note.name = endNote.name;
          nextSound.note.octave = endNote.octave;
          nextSound.note.fret = endNote.fret;

          sound = nextSound;
        }
      },

      transposeUp (sound) {
        if (sound.note.type !== 'ghost') {
          var bassString = workspace.trackSection.instrument.strings[sound.string];

          if (sound.style !== 'ring' && sound.note.fret < 24) {
            sound.note.fret++;
            var note = bassString.notes[sound.note.fret];
            sound.note.name = note.label[0];
            sound.note.octave = note.octave;
          }

          if (sound.endNote && sound.endNote.fret < 24) {
            sound.endNote.fret++;
            note = bassString.notes[sound.endNote.fret];
            sound.endNote.name = note.label[0];
            sound.endNote.octave = note.octave;
          }

          this.soundLabelChanged(sound)
        }
      },
      transposeDown (sound) {
        if (sound.note.type !== 'ghost') {
          var bassString = workspace.trackSection.instrument.strings[sound.string];

          if (sound.style !== 'ring' && sound.note.fret > 0) {
            sound.note.fret--;
            var note = bassString.notes[sound.note.fret];
            sound.note.name = note.label[0];
            sound.note.octave = note.octave;
          }

          if (sound.endNote && sound.endNote.fret > 0) {
            sound.endNote.fret--;
            note = bassString.notes[sound.endNote.fret];
            sound.endNote.name = note.label[0];
            sound.endNote.octave = note.octave;
          }

          this.soundLabelChanged(sound)
        }
      },

      shiftLeft (sound) {
        if (sound.prev) {
          return;
        }
        var startTime;
        if (sound.start > 0) {
          startTime = sound.start - 1 / sound.beat.subdivision;
        } else {
          var prevBeat = workspace.trackSection.prevBeat(sound.beat);
          startTime = -1 / prevBeat.subdivision;
        }
        workspace.trackSection.setSoundStart(sound, startTime);
      },
      shiftRight (sound) {
        if (sound.prev) {
          return;
        }
        var step = 1 / sound.beat.subdivision;
        workspace.trackSection.setSoundStart(sound, sound.start + step);
      },

      keyPressed (evt) {
        if (selector.last) {
          var sound = selector.last;
          switch (evt.keyCode) {
            case 46: // Del
              // selector.all.forEach(workspace.trackSection.deleteSound, workspace.trackSection);
              selector.all.forEach(s => {
                if (s.elem) {
                  soundAnimation(s.elem[0]);
                }
                workspace.trackSection.deleteSound(s);
              });
              selector.clearSelection();
              break;
            case 72: // h
              sound.style = 'hammer';
              this.soundStyleChanged(sound);
              break;
            case 80: // p
              sound.style = 'pull';
              this.soundStyleChanged(sound);
              break;
             case 82: // r
              sound.style = 'ring';
              this.soundStyleChanged(sound);
              break;
             case 190: // .
              selector.all.forEach(s => {
                if (s.note.type !== 'ghost' && !s.next) {
                  s.note.staccato = !s.note.staccato;
                }
              });
              break;
             case 38: // up
              selector.all.forEach(this.transposeUp, this);
              break;
             case 40: // down
              selector.all.forEach(this.transposeDown, this);
              break;
            case 37: // left
              if (evt.altKey) {
                workspace.trackSection.offsetSound(sound, -0.01);
              } else {
                selector.all.forEach(this.shiftLeft, this);
              }
              evt.preventDefault();
              break;
            case 39: // right
              if (evt.altKey) {
                workspace.trackSection.offsetSound(sound, 0.01);
              } else {
                selector.all.forEach(this.shiftRight, this);
              }
              evt.preventDefault();
              break;
            case 109: // -
              selector.all.forEach(sound => {
                sound.volume = Math.max(0, roundFloat(sound.volume-0.05));
              });
              break;
            case 107: // +
              selector.all.forEach(sound => {
                sound.volume = Math.min(1.0, roundFloat(sound.volume+0.05));
              });
              break;
            case 76: // l
              selector.all.forEach(sound => {
                var notes = sound.style !== 'ring'? [sound.note] : [];
                if (sound.endNote) {
                  notes.push(sound.endNote);
                }
                var changed = false;
                notes.forEach(note => {
                  const name = note.name || '';
                  if (name.endsWith('♯')) {
                    note.name = Notes.toFlat(name);
                    changed = true;
                  } else if (name.endsWith('♭')) {
                    note.name = Notes.toSharp(name);
                    changed = true;
                  }
                });
                if (changed) {
                  this.soundLabelChanged(sound);
                }
              });
              break;
            case 77: // m
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
            case 68: // d (debug)
              console.log(sound);
              break;
          }
          // evt.preventDefault();
          // return false;
        }
      }
    }
  }

})();