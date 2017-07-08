(function() {
  'use strict';


  const SharpNotes = 'C C♯ D D♯ E F F♯ G G♯ A A♯ B'.split(' ');
  const FlatNotes = 'C D♭ D E♭ E F G♭ G A♭ A B♭ B'.split(' ');
  function detune(note, offset) {
    var scale = note.name.indexOf('♭') !== -1? FlatNotes : SharpNotes;
    var index = scale.indexOf(note.name);
    index += offset;
    while (index < 0) {
      index += 12;
      note.octave--;
    }
    while (index > 11) {
      index -= 12;
      note.octave++;
    }
    note.fret += offset;
    note.name = scale[index];
  }

  function floatsEqual(a, b) {
    return Math.abs(a - b) <= 0.01;
  }

  class BaseTrackSection {
    constructor(section, data) {
      this.section = section;
      this.data = data;
      if (!data) {
        throw new Exception();
      }
      this.data.forEach(function(beat) {
        beat.data.forEach(function(sound) {
          Object.defineProperty(sound, 'beat', {value: 'static', writable: true});
          sound.beat = beat;
          if (sound.hasOwnProperty('subbeat')) {
            sound.start = (sound.subbeat - 1) / beat.subdivision;
          }
          // old bass model
          if (sound.hasOwnProperty('sound')) {
            sound.volume = sound.sound.volume;
            sound.note = sound.sound.note;
            if (sound.sound.noteLength) {
              sound.note.length = sound.sound.noteLength.length;
              sound.note.dotted = sound.sound.noteLength.dotted;
              sound.note.staccato = sound.sound.noteLength.staccato;
            }
            sound.style = sound.sound.style;
            sound.string = sound.sound.string;
            sound.prev = sound.sound.prev? true : undefined;
            sound.next = sound.sound.next? true : undefined;
            delete sound.sound;
            delete sound.subbeat;
            delete sound.note.code;
          }
          if (sound.note) {
            // convert old slide format
            if (sound.note.slide && sound.note.slide.endNote) {
              sound.endNote = sound.note.slide.endNote;
              delete sound.note.slide.endNote;
            }
            // convert old grace format
            if (sound.note.type === 'grace' && !sound.endNote) {
              sound.endNote = {
                name: sound.note.name,
                octave: sound.note.octave,
                fret: sound.note.fret
              }
              detune(sound.note, -2);
            }
            if (sound.note.type === 'ghost' && !sound.note.length) {
              sound.note.length = 16;
            }
          }
          this.initializeSound(sound);
        }, this);
      }, this);
    }

    initializeSound(sound) {}

    beat(bar, beat) {
      // var flatIndex = (bar-1)*this.timeSignature.top + beat-1;
      // return this.data[flatIndex];
      for (var i = 0; i < this.data.length; i++) {
        var beatData = this.data[i];
        if (beatData.bar === bar && beatData.beat === beat) {
          return beatData;
        }
      }
      beat = {
        bar: bar,
        beat: beat,
        subdivision: 4,
        meta: {},
        data: []
      };
      this.data.push(beat);
      return beat;
    }

    prevBeat(beat) {
      var barIndex = beat.bar;
      var beatIndex = beat.beat - 1;
      if (beatIndex === 0) {
        beatIndex = this.section.timeSignature.top;
        barIndex--;
      }
      if (barIndex > 0) {
        return this.beat(barIndex, beatIndex);
      }
    }

    nextBeat(beat) {
      var barIndex = beat.bar;
      var beatIndex = beat.beat + 1;

      if (beatIndex > this.section.timeSignature.top) {
        beatIndex = 1;
        barIndex++;
      }
      if (barIndex <= this.section.length) {
        return this.beat(barIndex, beatIndex);
      }
    }

    sound(beat, filter) {
      for (var i = 0; i < beat.data.length; i++) {
        var sound = beat.data[i];
        var match = true;
        for (var key in filter) {
          if (sound[key] !== filter[key]) {
            match = false;
            break;
          }
        }
        if (match) {
          return sound;
        }
      }
    }

    beatSounds(beat) {
      return beat.data;
    }

    addSound(beat, sound) {
      Object.defineProperty(sound, 'beat', {value: 'static', writable: true});
      sound.beat = beat
      delete sound.offset;
      this.initializeSound(sound);
      beat.data.push(sound);
    }

    deleteSound(sound) {
      var index = sound.beat.data.indexOf(sound);
      if (index !== -1) {
        sound.beat.data.splice(index, 1);
      }
    }

    clearBeat(beat) {
      beat.data.splice(0, beat.data.length);
    }

    loadBeats(beats) {
      beats.forEach(function(beat) {
        var destBeat = this.beat(beat.bar, beat.beat);
        Array.prototype.push.apply(destBeat.data, beat.data);
        destBeat.data.forEach(function(sound) {
          Object.defineProperty(sound, 'beat', {value: 'static', writable: true});
          sound.beat = destBeat;
          this.initializeSound(sound);
        }, this);
      }, this);

      // fix references with prev and next beat
      var firstBeat = this.beat(beats[0].bar, beats[0].beat);
      firstBeat.data.forEach(function(sound) {
        if (sound.prev && sound.start === 0) {
          var prev = this.prevSound(sound);
          if (prev) {
            prev.next = true;
          } else {
            sound.prev = false;
          }
        }
      }, this);
      var lastBeat = beats[beats.length-1];
      lastBeat = this.beat(lastBeat.bar, lastBeat.beat)
      lastBeat.data.forEach(function(sound) {
        if (sound.next && sound.end === 1) {
          var next = this.nextSound(sound);
          if (next) {
            next.prev = true;
          } else {
            sound.next = false;
          }
        }
      }, this);
    }

    forEachBeat(callback, obj) {
      if (obj) {
        callback = callback.bind(obj);
      }
      var bar, barIndex, beatIndex;
      for (barIndex = 1; barIndex <= this.section.length; barIndex++) {
        for (beatIndex = 1; beatIndex <= this.section.timeSignature.top ; beatIndex++) {
          callback(this.beat(barIndex, beatIndex));
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
          var sound = beat.data[j];
          callback(sound);
        }
      }
    }

    rawBeatData(beat) {
      return beat;
    }

    rawData() {
      return this.data;
    }
  }


  class NotesTrackSection extends BaseTrackSection {
    constructor(section, data) {
      super(section, data);
    }

    soundDuration(sound) {
      if (sound && sound.note) {
        var duration = this.section.timeSignature.bottom / sound.note.length;
        if (sound.note.dotted) {
          duration *= 1.5;
        }
        if (sound.beat.subdivision === 3) {
          duration *= 2/3;
        }
        return duration;
      }
    }

    initializeSound(sound) {
      Object.defineProperty(sound, 'end', {value: 'static', writable: true});
      if (sound.note && sound.note.length < 1) {
        sound.note.length = Math.round(1.0/sound.note.length);
      }
      sound.end = sound.start + this.soundDuration(sound);
    }

    nextSoundPosition(sound) {
      var beatOffset = parseInt(sound.end);
      var start = sound.end - beatOffset;

      var beat = sound.beat;
      while (beatOffset) {
        beat = this.nextBeat(beat);
        beatOffset--;
      }
      return {
        beat: beat,
        start: start
      };
    }

    nextSound(sound) {
      var position = this.nextSoundPosition(sound);
      if (!position.beat) return;

      var start = position.start;
      for (var i = 0; i < position.beat.data.length; i++) {
        var s = position.beat.data[i];
        if (s.string === sound.string && floatsEqual(s.start, start)) {
          return s;
        }
      }
    }

    prevSound(sound) {
      var ts = this.section.timeSignature;
      function sectionTime(beat, value) {
        var v1 = (beat.bar - 1)* ts.top;
        return (beat.bar - 1)* ts.top + beat.beat + value;
      }
      var absEnd = sectionTime(sound.beat, sound.start);
      // console.log('looking for: '+absEnd+' at string '+sound.string)
      var beat = sound.beat;
      while (beat) {
        for (var i = 0; i < beat.data.length; i++) {
          var s = beat.data[i];
          var stop = false;
          if (s.string === sound.string) {
            var end = sectionTime(beat, s.end);
            if (floatsEqual(end, absEnd)) {
              return s;
            }
            if (end < absEnd) {
              stop = true;
            }
          }
        }
        if (stop) {
          return;
        }
        beat = this.prevBeat(beat);
      }
    }

    deleteSound(sound) {
      if (sound.prev) {
        // console.log('BREAK PREV SOUND CHAIN')
        var prevSound = this.prevSound(sound);
        if (prevSound) delete prevSound.next;
      }
      if (sound.next) {
        var next = this.nextSound(sound);
        if (next) {
          delete next.prev;
          this.deleteSound(next);
        }
      }
      super.deleteSound(sound);
    }

    clearBeat(beat) {
      while (beat.data.length) {
        this.deleteSound(beat.data[0]);
      }
    }

    offsetSound(sound, offset) {
      sound.offset = parseFloat(((sound.offset || 0) + offset).toFixed(2));
      if (sound.offset === 0) delete sound.offset;

      // sound.start = parseFloat((sound.start + offset ).toFixed(2));
      // collect chained sounds before applying offset (important)
      // var sounds = [sound];
      // while (sound.next) {
      //   sound = workspace.trackSection.nextSound(sound);
      //   sounds.push(sound);
      // }
      // sounds.forEach(function(s) {
      //   s.start = parseFloat((s.start + offset).toFixed(2));
      //   s.end = parseFloat((s.end + offset).toFixed(2));
      // });
    }
  }


  angular
    .module('bd.app')
    .value('DrumTrackSection', BaseTrackSection)
    .value('TrackSection', NotesTrackSection)

})();