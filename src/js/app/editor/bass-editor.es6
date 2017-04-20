(function() {
  'use strict';

  angular
    .module('bd.app')
    .factory('bassDragHandler', dragHandler)
    .factory('basicHandler', basicHandler)


  /***************** Private helper functions ******************/

  function dragHandler(workspace, DragHandler, basicHandler) {
    class BassDragHandler extends DragHandler {

      validateDrop(beat, string) {
        if (this.dragSound.note.type === 'ghost') {
          return true;
        }
        // if (this.dragChannel === 'instrument') {
          var fret = workspace.track.instrument.stringFret(string.label, this.dragSound.note);
          return fret >= 0;
        // }
        return false;
      }

      updateDropSound(sound, beat, string) {
        // console.log('--- updateDropSound ---');
        sound.string = string.label;
        if (sound.note.type !== 'ghost') {
          sound.note.fret = workspace.track.instrument.stringFret(string.label, sound.note);
        }
      }

      onDragStart(evt) {
        if (this.dragChannel !== 'instrument') {
          basicHandler.selectSound(evt, this.dragSound);
        }
      }

      onDragEnd(evt, sound) {
        basicHandler.selectSound(evt, sound, true);
      }

    }
    return new BassDragHandler('bass');
  }


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

  function basicHandler(workspace, swiperControl, Notes) {

    return {
      selected: {
        sound: null,
        element: null
      },
      createSound: function(evt, beat) {
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
        sound.note.code = sound.note.name + sound.note.octave;
        workspace.trackSection.addSound(beat, sound);
        return sound;
      },
      selectSound: function(evt, sound, focus) {
        console.log('selectSound');
        this.clearSelection();

        this.selected.sound = sound;
        this.selected.element = evt? soundContainerElem(evt.target) : swiperControl.getSoundElem(sound);
        this.selected.element.classList.add('selected');
        if (focus) {
          this.selected.element.focus();
        }
      },
      clearSelection: function() {
        if (this.selected.element) {
          this.selected.element.classList.remove('selected');
        }
        this.selected.sound = null;
        this.selected.element = null;
      },

      soundStyleChanged: function(style) {
        if (style === 'hammer' || style === 'pull' || style === 'ring') {
          var selectedSound = this.selected.sound;
          var soundOnLeft = workspace.trackSection.prevSound(selectedSound);
          console.log(soundOnLeft)
          if (soundOnLeft && soundOnLeft.note) {
            soundOnLeft.next = true;
            selectedSound.prev = true;

            if (style === 'ring') {
              var ringNote = this.selected.sound.note;
              var prevNote = soundOnLeft.note.type === 'slide'? soundOnLeft.note.slide.endNote : soundOnLeft.note;
              var fretOffset = selectedSound.note.fret - prevNote.fret;
              if (fretOffset === 0) {
                angular.merge(selectedSound.note, {
                  type: 'regular',
                  code: prevNote.code,
                  fret: prevNote.fret,
                  name: prevNote.name,
                  octave: prevNote.octave,
                });
              } else {
                selectedSound.note = {
                  type: 'slide',
                  code: prevNote.code,
                  fret: prevNote.fret,
                  name: prevNote.name,
                  octave: prevNote.octave,
                  length: ringNote.length,
                  dotted: ringNote.dotted,
                  slide: {
                    start: 0.05,
                    end: 0.85,
                    endNote: {
                      code: ringNote.code,
                      fret: ringNote.fret,
                      name: ringNote.name,
                      octave: ringNote.octave
                    }
                  }
                };
              }
            }
          } else {
            this.selected.sound.style = 'finger';
          }
        } else {
          if (this.selected.sound.prev) {
            delete workspace.trackSection.prevSound(this.selected.sound).next;
            delete this.selected.sound.prev;
          }
        }
      },

      soundLabelChanged(sound) {
        while (sound.next) {
          var nextSound = workspace.trackSection.nextSound(sound);
          if (nextSound.style === 'hammer' || nextSound.style === 'pull') {
            break;
          }
          var endNote = sound.note.type === 'slide'? sound.note.slide.endNote : sound.note;
          nextSound.note.name = endNote.name;
          nextSound.note.octave = endNote.octave;
          nextSound.note.code = endNote.code;
          nextSound.note.fret = endNote.fret;

          sound = nextSound;
        }
      },

      keyPressed: function(evt) {
        console.log(evt.keyCode);
        if (this.selected.sound) {
          var sound = this.selected.sound;
          switch (evt.keyCode) {
            case 46: // Del
              workspace.trackSection.deleteSound(sound);
              this.clearSelection();
              break;
            case 72: // h
              sound.style = 'hammer';
              this.soundStyleChanged('hammer');
              break;
            case 80: // p
              sound.style = 'pull';
              this.soundStyleChanged('pull');
              break;
             case 82: // r
              sound.style = 'ring';
              this.soundStyleChanged('ring');
              break;
             case 190: // .
              if (sound.note.type !== 'ghost' && !sound.next) {
                sound.note.staccato = !sound.note.staccato;
              }
              break;
             case 38: // up
              if (sound.note.type === 'regular' && sound.note.fret < 24) {
                sound.note.fret++;
                var bassString = workspace.trackSection.instrument.strings[sound.string];
                var note = bassString.notes[sound.note.fret];
                sound.note.name = note.label[0];
                sound.note.octave = note.octave;
                sound.note.code = sound.note.name+sound.note.octave;
                this.soundLabelChanged(sound)
              }
              break;
             case 40: // down
              if (sound.note.type === 'regular' && sound.note.fret > 0) {
                sound.note.fret--;
                var bassString = workspace.trackSection.instrument.strings[sound.string];
                var note = bassString.notes[sound.note.fret];
                sound.note.name = note.label[0];
                sound.note.octave = note.octave;
                sound.note.code = sound.note.name+sound.note.octave;
                this.soundLabelChanged(sound)
              }
              break;
            case 109: // -
              sound.volume -= 0.1;
              console.log(sound.volume);
              break;
            case 107: // +
              sound.volume += 0.1;
              console.log(sound.volume);
              break;
            case 76: // l
              if (sound.note.name.endsWith('♯')) {
                sound.note.name = Notes.toFlat(sound.note.name);
                this.soundLabelChanged(sound)
              } else if (sound.note.name.endsWith('♭')) {
                sound.note.name = Notes.toSharp(sound.note.name);
                this.soundLabelChanged(sound)
              }
              evt.preventDefault();
              return false;
          }
        }
      }
    }
  }

    function bassResizeHandler(ResizeHandler, eventHandler, workspace) {
      class BassResizeHandler extends ResizeHandler {

        beforeResize(sound, info) {
          console.log('bass beforeResize');
        }

        afterResize(sound, info) {
          function barPosition(beat, value) {
            return (beat.bar - 1 ) * workspace.section.timeSignature.top + beat.beat - 1 + value;
          }
          var endPosition = barPosition(sound.beat, sound.end);
          console.log(endPosition)
          var beat = sound.beat;
          var overlappingSound;


          var sounds = [].concat(workspace.trackSection.beatSounds(beat));
          while (beat && barPosition(beat, 1) < endPosition) {
            beat = workspace.trackSection.nextBeat(beat);
            Array.prototype.push.apply(sounds, workspace.trackSection.beatSounds(beat));
          }
          console.log(sounds);
          for (var i = 0; i < sounds.length; i++) {
            var s = sounds[i];
            if (s !== sound && s.string === sound.string && barPosition(s.beat, s.start) < endPosition && barPosition(s.beat, s.end) >= endPosition) {
              console.log('overlapping');
              overlappingSound = s;
              break;
            }
          }
          if (overlappingSound && !overlappingSound.next && overlappingSound.note && overlappingSound.note.type === 'regular') {
            sound.note.type = 'slide';
            sound.note.slide = {
              endNote: angular.copy(overlappingSound.note)
            };

            workspace.trackSection.deleteSound(overlappingSound);
          }
        }
      }
      return new BassResizeHandler();
    }

  angular
    .module('bd.app')
    .factory('bassResizeHandler', bassResizeHandler)

})();