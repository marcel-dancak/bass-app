(function() {
  'use strict';

  angular
    .module('bd.app')
    .value('DrumSection', DrumSection);

  function DrumSection(drums, section) {
    this.section = section;
    this.type = 'drums';
    this.drums = drums;
    this.bars = [];
    this.setLength(section.length || 1);
  }

  DrumSection.prototype.setLength = function(length) {
    console.log('set length '+length);
    while (this.bars.length < length) {
      this._newBar();
    }
  };

  DrumSection.prototype._newBar = function() {
    var barIndex = this.bars.length+1;
    var beats = [];
    var beat, subbeat;
    for (beat = 0; beat < 12; beat++) {
      var drumsBeat = {
        subdivision: 4,
        bar: barIndex,
        beat: beat+1,
        subbeats: []
      };
      for (subbeat = 0; subbeat < 4; subbeat++) {
        var drumSubbeatGrid = {};
        this.drums.forEach(function(drum) {
          drumSubbeatGrid[drum.name] = {
            drum: drum,
            volume: 0.0
          }
        });
        drumsBeat.subbeats.push(drumSubbeatGrid);
      }
      beats.push(drumsBeat);
    }
    this.bars.push(beats);
  };


  DrumSection.prototype.beat = function(bar, beat) {
    return this.bars[bar-1][beat-1];
  };

  DrumSection.prototype.subbeat = function(bar, beat, subbeat) {
    return this.bars[bar-1][beat-1].subbeats[subbeat-1];
  };

  DrumSection.prototype.forEachBeat = function(callback) {
    var bar, barIndex, beatIndex;
    for (barIndex = 0; barIndex < this.section.length; barIndex++) {
      bar = this.bars[barIndex];
      for (beatIndex = 0; beatIndex < this.section.timeSignature.top ; beatIndex++) {
        callback({
          beat: bar[beatIndex],
          bar: barIndex+1,
          index: beatIndex+1
        });
      }
    }
  };

  /*
  Section.prototype.forEachDrumSubbeat = function(callback) {
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

  DrumSection.prototype.getSounds = function(drumsBeat) {
    var sounds = [];
    drumsBeat.subbeats.forEach(function(subbeat, subbeatIndex) {
      var drumName, drumSound;
      for (drumName in subbeat) {
        drumSound = subbeat[drumName];
        if (drumSound.volume > 0) {
          // console.log('bar {0} beat {1} subbeat {2}'.format(beat.bar, beat.index, subbeatIndex+1));
          sounds.push({
            subbeat: subbeatIndex+1,
            volume: drumSound.volume,
            drum: drumName
          });
        }
      }
    });
    return sounds;
  };

  DrumSection.prototype.clearBeat = function(drumsBeat) {
    drumsBeat.subbeats.forEach(function(subbeat) {
      var drumName, drumSound;
      for (drumName in subbeat) {
        if (!drumName.startsWith('$$')) {
          drumSound = subbeat[drumName]
          drumSound.volume = 0;
        }
      }
    });
  };

})();
