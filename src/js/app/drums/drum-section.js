(function() {
  'use strict';

  angular
    .module('bd.app')
    .value('DrumSection', DrumSection)
    .value('DrumTrackSection', DrumTrackSection);


  function DrumTrackSection(data) {
    this.data = data;
    this.type = 'drums';
  }

  DrumTrackSection.prototype.beat = function(bar, beat) {
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
      data: []
    };
  };

  DrumTrackSection.prototype.sound = function(bar, beat, subbeat, drum) {
    var items = this.beat(bar, beat).data;
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (item.subbeat === subbeat && item.sound.drum.name === drum) {
        return item.sound;
      }
    }
  };

  DrumTrackSection.prototype.beatSounds = function(beat) {
    return beat.data;
  };

  DrumTrackSection.prototype.rawData = function() {
    return this.data;
  };

  DrumTrackSection.prototype.forEachSound = function(callback, obj) {
    if (obj) {
      callback = callback.bind(obj);
    }
    for (var i = 0; i < this.data.length; i++) {
      var beat = this.data[i];
      for (var j = 0; j < beat.data.length; j++) {
        var sound = beat.data[j];
        var info = {
          bar: beat.bar,
          beat: beat.beat,
          subbeat: beat.data[j].subbeat
        };
        callback(sound, info);
      }
    }
  };


  function DrumSection(section) {
    this.section = section;
    this.type = 'drums';
    this.bars = [];
    this.setLength(section.length || 1);
  }

  DrumSection.prototype.loadBeats = function(beats) {
    var nameToIndex = {};
    this.instrument.forEach(function(drum, index) {
      nameToIndex[drum.name] = index;
    });
    // override selected section data
    beats.forEach(function(beat) {
      var destBeat = this.beat(beat.bar, beat.beat);
      destBeat.subdivision = beat.subdivision;
      beat.data.forEach(function(sound) {
        var subbeat = this.subbeat(beat.bar, beat.beat, sound.subbeat);
        subbeat[nameToIndex[sound.drum]].volume = sound.volume;
      }, this);
    }, this);
  };

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

        for (var i = 0; i < 8; i++) {
          drumSubbeatGrid[i] = {
            volume: 0.0
          }
        }
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

  DrumSection.prototype.forEachBeat = function(callback, obj) {
    if (obj) {
      callback = callback.bind(obj);
    }
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


  DrumSection.prototype.beatSounds = function(drumsBeat) {
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
            drum: this.instrument[drumName].name
          });
        }
      }
    }, this);
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

  DrumSection.prototype.forEachSound = function(callback, obj) {
    this.forEachBeat(function(beat) {
      this.beatSounds(beat.beat).forEach(callback, obj);
    }, this);
  };

  DrumSection.prototype.rawBeatData = function(beat) {
    return {
      bar: beat.bar,
      beat: beat.beat,
      subdivision: beat.subdivision,
      data: this.beatSounds(this.beat(beat.bar, beat.beat))
    };
  };

  DrumSection.prototype.rawData = function() {
    var data = [];
    this.forEachBeat(function(beat) {
      data.push({
        bar: beat.bar,
        beat: beat.index,
        subdivision: beat.beat.subdivision,
        data: this.beatSounds(beat.beat)
      });
    }, this);
    return data;
  };

  DrumSection.prototype.convertToTrackSection = function() {
    var data = angular.copy(this.rawData());
    return new DrumTrackSection(data);
  };

})();
