(function() {
  'use strict';

  angular
    .module('bd.app')
    .value('Section', Section);

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
        this.bass.allStrings.forEach(function(string) {
          bassSubbeatGrid[string.label] = {
            sound: {}
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


  Section.prototype.bassBeat = function(bar, beat) {
    return this.bars[bar-1].bassBeats[beat-1];
  };

  Section.prototype.bassSubbeat = function(bar, beat, subbeat) {
    return this.bars[bar-1].bassBeats[beat-1].subbeats[subbeat-1];
  };

  Section.prototype.drumsBeat = function(bar, beat) {
    return this.bars[bar-1].drumsBeats[beat-1];
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

  Section.prototype.getBassSounds = function(bassBeat) {
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
  };

  Section.prototype.getDrumsSounds = function(drumsBeat) {
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

  Section.prototype.clearBassBeat = function(bassBeat) {
    bassBeat.subbeats.forEach(function(subbeat) {
      var string, bassSound;
      for (string in subbeat) {
        if (!string.startsWith('$')) {
          bassSound = subbeat[string].sound;
          delete bassSound.style;
          delete bassSound.note;
          delete bassSound.noteLength;
          delete bassSound.prev;
          delete bassSound.next;
        }
      }
    });
  };

  Section.prototype.clearDrumsBeat = function(drumsBeat) {
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

  // update references
  Section.prototype.updateBassReferences = function(beat) {
    var sounds = this.getBassSounds(beat);
    for (var i = 0; i < sounds.length; i++) {
      var sound = sounds[i].sound;
      if (sound.prev && angular.isUndefined(sound.prev.ref)) {
        Object.defineProperty(sound.prev, 'ref', {value: 'static', writable: true});
        sound.prev.ref = this.bassSubbeat(sound.prev.bar, sound.prev.beat, sound.prev.subbeat)[sound.prev.string.label].sound;
      }
      if (sound.next && angular.isUndefined(sound.next.ref)) {
        Object.defineProperty(sound.next, 'ref', {value: 'static', writable: true});
        sound.next.ref = this.bassSubbeat(sound.next.bar, sound.next.beat, sound.next.subbeat)[sound.next.string.label].sound;
      }
    }
  };

})();
