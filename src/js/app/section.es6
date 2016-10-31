(function() {
  'use strict';


  class TrackSection {
    constructor(data) {
      this.data = data;
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
      return {
        bar: bar,
        beat: beat,
        subdivision: 4,
        meta: {},
        data: []
      };
    }

    beatSounds(beat) {
      return beat.data;
    }

    rawData() {
      return this.data;
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
      return new this.TrackSectionClass(data);
    }
  }


  angular
    .module('bd.app')
    .value('TrackSection', TrackSection)
    .value('EditableTrackSection', EditableTrackSection);

})();