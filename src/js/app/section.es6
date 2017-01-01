(function() {
  'use strict';


  class TrackSection {
    constructor(section, data) {
      this.section = section;
      this.data = data;
      if (!data) {
        throw new Exception();
      }
      this.data.forEach(function(beat) {
        beat.data.forEach(function(sound) {
          Object.defineProperty(sound, 'end', {value: 'static', writable: true});
          Object.defineProperty(sound, 'beat', {value: 'static', writable: true});
          // Object.defineProperty(sound, 'grid', {value: 'static', writable: true});
          sound.beat = beat;
          sound.end = sound.start + this.soundDuration(sound);
        }, this);
      }, this);
    }

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

    beatSounds(beat) {
      return beat.data;
    }

    rawData() {
      return this.data;
    }

    sound(beat, subbeat, string) {
      var item = beat.data.find(function(item) {
        return item.subbeat === subbeat && item.sound.string === string;
      });
      if (item) {
        return item.sound;
      }
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
      console.log('looking for: '+absEnd+' at string '+sound.string)
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

    soundDuration(sound) {
      if (sound && sound.note) {
        var duration = this.section.timeSignature.bottom * sound.note.length;
        if (sound.note.dotted) {
          duration *= 1.5;
        }
        if (sound.beat.subdivision === 3) {
          duration *= 2/3;
        }
        return duration;
      }
    }

    addSound(beat, sound) {
      Object.defineProperty(sound, 'end', {value: 'static', writable: true});
      Object.defineProperty(sound, 'beat', {value: 'static', writable: true});
      sound.beat = beat;
      sound.end = sound.start + this.soundDuration(sound);
      beat.data.push(sound);
    }

    deleteSound(sound) {
      if (sound.prev) {
        console.log('BREAK PREV SOUND CHAIN')
        var prevSound = this.prevSound(sound);
        delete prevSound.next;
      }
      if (sound.next) {
        var next = this.nextSound(sound);
        delete next.prev;
        this.deleteSound(next);
      }
      var index = sound.beat.data.indexOf(sound);
      if (index !== -1) {
        sound.beat.data.splice(index, 1);
      }
    }

    clearBeat(beat) {
      beat.data.splice(0, beat.data.length);
    }

    rawBeatData(beat) {
      return beat;
    }

    loadBeats(beats) {
      beats.forEach(function(beat) {
        var destBeat = this.beat(beat.bar, beat.beat);
        Array.prototype.push.apply(destBeat.data, beat.data);

        destBeat.data.forEach(function(sound) {
          Object.defineProperty(sound, 'end', {value: 'static', writable: true});
          Object.defineProperty(sound, 'beat', {value: 'static', writable: true});
          sound.beat = destBeat;
          sound.end = sound.start + this.soundDuration(sound);
        }, this);
      }, this);
    }
  }

  class EditableTrackSection {
    constructor(section, TrackSectionClass) {
      this.section = section;
      this.TrackSectionClass = TrackSectionClass;
      this.bars = [];
      this.setLength(section.length || 1);
    }

    setLength(length) {
      console.log('set length '+length);
      while (this.bars.length < length) {
        this._newBar();
      }
    }

    _newBar() {
      var barIndex = this.bars.length+1;
      var beats = [];
      var beat, subbeat;
      for (beat = 0; beat < 12; beat++) {
        var bassSubbeats = [];
        var trackBeat = {
          subdivision: 4,
          bar: barIndex,
          beat: beat+1,
          meta: {},
          subbeats: []
        };
        for (subbeat = 0; subbeat < 4; subbeat++) {
          trackBeat.subbeats.push(this._createSubbeatData());
        }
        beats.push(trackBeat);
      }
      this.bars.push(beats);
    }

    beat(bar, beat) {
      return this.bars[bar-1][beat-1];
    }

    subbeat(bar, beat, subbeat) {
      return this.bars[bar-1][beat-1].subbeats[subbeat-1];
    }

    nextBeat(beat) {
      var barIndex = beat.bar;
      var beatIndex = beat.beat + 1;
      if (beatIndex > this.section.timeSignature.top) {
        beatIndex = 1;
        barIndex++;
      }
      if (barIndex > this.section.length) {
        return null;
      }
      return this.beat(barIndex, beatIndex);
    }

    forEachBeat(callback, obj) {
      if (obj) {
        callback = callback.bind(obj);
      }
      var bar, barIndex, beatIndex;
      for (barIndex = 0; barIndex < this.section.length; barIndex++) {
        bar = this.bars[barIndex];
        for (beatIndex = 0; beatIndex < this.section.timeSignature.top ; beatIndex++) {
          callback(bar[beatIndex]);
        }
      }
    }

    clearBeat(beat) {
      beat.subbeats.forEach(function(subbeat) {
        for (var key in subbeat) {
          if (!key.startsWith('$')) {
            this.clearSound(subbeat[key]);
          }
        }
      }, this);
    };

    rawBeatData(beat) {
      return {
        bar: beat.bar,
        beat: beat.beat,
        subdivision: beat.subdivision,
        meta: beat.meta,
        data: this.beatSounds(this.beat(beat.bar, beat.beat))
      };
    }

    rawData() {
      var data = [];
      this.forEachBeat(function(beat) {
        data.push(this.rawBeatData(beat));
      }, this);
      return data;
    }

    convertToTrackSection() {
      var data = angular.copy(this.rawData());
      return new this.TrackSectionClass(this.section, data);
    }
  }


  angular
    .module('bd.app')
    .value('TrackSection', TrackSection)
    .value('EditableTrackSection', EditableTrackSection);

})();