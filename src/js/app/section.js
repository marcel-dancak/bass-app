(function() {
  'use strict';

  angular
    .module('bd.app')
    .factory('Section', section);

  function section() {

    function Section(bass, drums, options) {
      this.timeSignature = options.timeSignature || {
        top: 4,
        bottom: 4
      };
      this.bass = bass;
      this.drums = drums;
      this.bars = [];
      this.length = options.length || 1;
      this.setLength(this.length);
    }


    Section.prototype.setLength = function(length) {
      console.log('set length '+length);
      while (this.bars.length < this.length) {
        this._newBar();
      }
      this.length = length;
    };

    Section.prototype._newBar = function() {
      var barIndex = this.bars.length+1;
      var bassBeats = [];
      var drumsBeats = [];
      var beat, subbeat;
      for (beat = 0; beat < 12; beat++) {
        var bassSubbeats = [];
        var drumsBeat = {
          subdivision: 4,
          bar: barIndex,
          beat: beat+1,
          subbeats: []
        };
        var bassBeat = {
          subdivision: 4,
          bar: barIndex,
          beat: beat+1,
          subbeats: []
        };
        for (subbeat = 0; subbeat < 4; subbeat++) {
          var bassSubbeatGrid = {};
          this.bass.strings.forEach(function(string) {
            bassSubbeatGrid[string.index] = {
              sound: {},
              width: 1
            };
          });
          var drumSubbeatGrid = {};
          this.drums.forEach(function(drum) {
            drumSubbeatGrid[drum.name] = {
              drum: drum,
              volume: 0.0
            }
          });
          bassBeat.subbeats.push(bassSubbeatGrid);
          drumsBeat.subbeats.push(drumSubbeatGrid);
        }
        bassBeats.push(bassBeat);
        drumsBeats.push(drumsBeat);
      }
      this.bars.push({
        bassBeats: bassBeats,
        drumsBeats: drumsBeats
      });
    };

    Section.prototype.bassSubbeat = function(bar, beat, subbeat) {
      return this.bars[bar-1].bassBeats[beat-1].subbeats[subbeat-1];
    };

    Section.prototype.drumsSubbeat = function(bar, beat, subbeat) {
      return this.bars[bar-1].drumsBeats[beat-1].subbeats[subbeat-1];
    };

    Section.prototype.forEachBeat = function(callback) {
      var bar, barIndex, beatIndex;
      for (barIndex = 0; barIndex < this.length; barIndex++) {
        bar = this.bars[barIndex];
        for (beatIndex = 0; beatIndex < this.timeSignature.top ; beatIndex++) {
          var bassBeat = bar.bassBeats[beatIndex];
          var drumsBeat = bar.drumsBeats[beatIndex];
          callback({
            bass: bassBeat,
            drums: drumsBeat,
            bar: barIndex+1,
            index: beatIndex+1
          });
        }
      }
    };
    /*
    Section.prototype.forEachDrumsSubbeat = function(callback) {
      var bar, barIndex, beatIndex;
      for (barIndex = 0; barIndex < this.length; barIndex++) {
        bar = this.bars[barIndex];
        for (beatIndex = 0; beatIndex < this.timeSignature.top ; beatIndex++) {
          var drumsBeat = bar.drumsBeats[beatIndex];
          drumsBeat.subbeats.forEach(function(subbeat, index) {
            callback({
              data: subbeat,
              bar: barIndex+1,
              beat: beatIndex+1,
              subbeat: index+1
            });
          });
        }
      }
    };*/

    Section.prototype.forEachBassSubbeat = function(callback) {
      var bar, beat, barIndex, beatIndex;
      for (barIndex = 0; barIndex < this.length; barIndex++) {
        bar = this.bars[barIndex];
        for (beatIndex = 0; beatIndex < this.timeSignature.top ; beatIndex++) {
          beat = bar.bassBeats[beatIndex];
          beat.subbeats.forEach(function(subbeat, index) {
            callback({
              data: subbeat,
              bar: barIndex+1,
              beat: beatIndex+1,
              subbeat: index+1
            });
          });
        }
      }
    };

    Section.prototype.get = function() {};

    return Section;
  }

})();