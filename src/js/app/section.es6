(function() {
  'use strict';


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
            sound.prev = Boolean(sound.sound.prev);
            sound.next = Boolean(sound.sound.next);
            // delete sound.sound;
            // TODO fix triplets
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
      var start = position.start;
      for (var i = 0; i < position.beat.data.length; i++) {
        var s = position.beat.data[i];
        if (s.string === sound.string && s.start === start) {
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
            if (end === absEnd) {
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
        delete prevSound.next;
      }
      if (sound.next) {
        var next = this.nextSound(sound);
        delete next.prev;
        this.deleteSound(next);
      }
      super.deleteSound(sound);
    }

    clearBeat(beat) {
      while (beat.data.length) {
        this.deleteSound(beat.data[0]);
      }
    }
  }


  angular
    .module('bd.app')
    .value('DrumTrackSection', BaseTrackSection)
    .value('TrackSection', NotesTrackSection)

})();