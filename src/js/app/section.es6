(function() {
  'use strict';


  class TrackSection {
    constructor(section, data) {
      this.section = section;
      this.data = data;
      if (!data) {
        throw new Exception();
      }
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

    nextSoundPosition(beat, sound) {
      var beatOffset = parseInt(sound.end);
      var start = sound.end - beatOffset;

      while (beatOffset) {
        beat = this.nextBeat(beat);
        beatOffset--;
      }
      return {
        beat: beat,
        start: start
      };
    }

    nextSound(beat, sound) {
      var position = this.nextSoundPosition(beat, sound);
      var start = position.start;
      for (var i = 0; i < position.beat.data.length; i++) {
        var s = position.beat.data[i];
        if (s.string === sound.string && s.start === start) {
          return {
            beat: position.beat,
            sound: s
          }
        }
      }
    }

    prevSound(beat, sound) {
      var ts = this.section.timeSignature;
      function sectionTime(aBeat, value) {
        var v1 = (aBeat.bar - 1)* ts.top;
        return (aBeat.bar - 1)* ts.top + aBeat.beat + value;
      }
      var absEnd = sectionTime(beat, sound.start);
      console.log('looking for: '+absEnd+' at string '+sound.string)
      while (beat) {
        for (var i = 0; i < beat.data.length; i++) {
          var s = beat.data[i];
          var stop = false;
          if (s.string === sound.string) {
            var end = sectionTime(beat, s.end);
            if (end === absEnd) {
              return {
                beat: beat,
                sound: s
              }
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

    soundDuration(beat, sound) {
      if (sound && sound.note) {
        var duration = this.section.timeSignature.bottom * sound.note.length;
        if (sound.note.dotted) {
          duration *= 1.5;
        }
        if (beat.subdivision === 3) {
          duration *= 2/3;
        }
        return duration;
      }
    }

    deleteSound(beat, sound) {
      if (sound.prev) {
        console.log('BREAK PREV SOUND CHAIN')
        var prevSound = this.prevSound(beat, sound).sound;
        delete prevSound.next;
      }
      if (sound.next) {
        var next = this.nextSound(beat, sound);
        delete next.sound.prev;
        this.deleteSound(next.beat, next.sound);
      }
      var index = beat.data.findIndex(function(item) {
        return item === sound;
      });
      if (index !== -1) {
        beat.data.splice(index, 1);
      }
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