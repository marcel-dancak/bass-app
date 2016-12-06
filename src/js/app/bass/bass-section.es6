(function() {
  'use strict';

  angular
    .module('bd.app')
    .factory('BassSection', bassSection)
    .factory('BassTrackSection', bassTrackSection);

  function bassTrackSection(TrackSection) {
    class BassTrackSection extends TrackSection {
      constructor(data) {
        super(data);
        this.type = 'bass';

        this.forEachSound(function(sound, index) {
          if (sound.style === 'finger') {
            // if (sound.note.fret > 0 && sound.note.type !== 'ghost')
            // sound.style = 'pick';
          }
          if (sound.prev && angular.isUndefined(sound.prev.ref)) {
            Object.defineProperty(sound.prev, 'ref', {value: 'static', writable: true});
            sound.prev.ref = this.sound(sound.prev.bar, sound.prev.beat, sound.prev.subbeat, sound.prev.string);
          }
          if (sound.next && angular.isUndefined(sound.next.ref)) {
            Object.defineProperty(sound.next, 'ref', {value: 'static', writable: true});
            sound.next.ref = this.sound(sound.next.bar, sound.next.beat, sound.next.subbeat, sound.next.string);
          }
        }, this);
      }

      sound(bar, beat, subbeat, string) {
        var items = this.beat(bar, beat).data;
        for (var i = 0; i < items.length; i++) {
          var item = items[i];
          if (item.subbeat === subbeat && item.sound.string === string) {
            return item.sound;
          }
        }
      }

      forEachSound(callback, obj) {
        if (obj) {
          callback = callback.bind(obj);
        }
        for (var i = 0; i < this.data.length; i++) {
          var beat = this.data[i];
          for (var j = 0; j < beat.data.length; j++) {
            var sound = beat.data[j].sound;
            var index = {
              bar: beat.bar,
              beat: beat.beat,
              subbeat: beat.data[j].subbeat
            };
            callback(sound, index);
          }
        }
      }
    }
    return BassTrackSection;
  }


  function bassSection(EditableTrackSection, BassTrackSection) {

    class BassSection extends EditableTrackSection {
      constructor(section) {
        super(section, BassTrackSection);
        this.type = 'bass';
      }

      _createSubbeatData() {
        var bassSubbeatGrid = {};
        ['B', 'E', 'A', 'D', 'G'].forEach(function(string) {
          bassSubbeatGrid[string] = {
            sound: {}
          };
        });
        return bassSubbeatGrid;
      }

      loadBeats(beats) {

        // override selected section data
        beats.forEach(function(beat) {
          var destBeat = this.beat(beat.bar, beat.beat);
          destBeat.subdivision = beat.subdivision;
          destBeat.meta = beat.meta;
          beat.data.forEach(function(item) {
            // temporary cleaning of obsolete attribute
            if (item.sound.note.label) {
              // console.log(item.sound.note.label);
              delete item.sound.note.label;
            }
            var subbeat = this.subbeat(beat.bar, beat.beat, item.subbeat);
            angular.extend(subbeat[item.sound.string].sound, item.sound);
          }, this);
        }, this);

        // update references
        this.forEachBeat(this.updateBassReferences, this);
      }

      clearSound(sound) {
        if (sound.hasOwnProperty('sound')) {
          sound = sound.sound;
        }
        if (sound.prev) {
          delete sound.prev.ref.next;
        }
        if (sound.next) {
          this.clearSound(sound.next.ref);
        }
        Object.keys(sound).forEach(function(property) {
          delete sound[property];
        });
      }

      updateBassReferences(beat) {

        var sounds = this.beatSounds(beat);
        for (var i = 0; i < sounds.length; i++) {
          var sound = sounds[i].sound;

          if (sound.prev) {
            if (angular.isUndefined(sound.prev.ref)) {
              Object.defineProperty(sound.prev, 'ref', {value: 'static', writable: true});
            }
            // fix of invalid bar index (after copy/paste) - TODO: better solution
            if (sound.prev.bar !== beat.bar) {
              sound.prev.bar = beat.beat === 1 || sound.prev.beat >= beat.beat? beat.bar - 1 : beat.bar;
            }
            var subbeat = this.subbeat(sound.prev.bar, sound.prev.beat, sound.prev.subbeat);
            sound.prev.ref = subbeat[sound.prev.string].sound;
          }
          if (sound.next) {
            if (angular.isUndefined(sound.next.ref)) {
              Object.defineProperty(sound.next, 'ref', {value: 'static', writable: true});
            }
            // fix of invalid bar index (after copy/paste) - TODO: better solution
            if (sound.next.bar !== beat.bar) {
              sound.next.bar = sound.next.beat === 1 || sound.next.beat < beat.beat? beat.bar + 1 : beat.bar;
            }
            var subbeat = this.subbeat(sound.next.bar, sound.next.beat, sound.next.subbeat);
            sound.next.ref = subbeat[sound.next.string].sound;
          }
        }
      }

      forEachSound(callback, obj) {
        this.forEachBeat(function(beat) {
          this.beatSounds(beat).map(function(i) {return i.sound}).forEach(callback, obj);
        }, this);
      }

      beatSounds(bassBeat) {
        var sounds = [];
        bassBeat.subbeats.forEach(function(subbeat, subbeatIndex) {
          var string, bassSound;
          for (string in subbeat) {
            if (string.startsWith('$')) {
              continue;
            }
            bassSound = subbeat[string].sound;
            if (bassSound.note) {
              sounds.push({
                subbeat: subbeatIndex+1,
                sound: bassSound
              });
            }
          }
        });
        return sounds;
      }
    }

    return BassSection;
  }

})();
