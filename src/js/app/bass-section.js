(function() {
  'use strict';

  angular
    .module('bd.app')
    .value('BassSection', BassSection)
    .value('BassTrackSection', BassTrackSection);

  function BassTrackSection(data) {
    this.data = data;
    this.type = 'bass';

    this.forEachSound(function(sound, info) {
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

  BassTrackSection.prototype.beat = function(bar, beat) {
    // var flatIndex = (bar-1)*this.timeSignature.top + beat-1;
    // return this.data[flatIndex];
    for (var i = 0; i < this.data.length; i++) {
      var beatData = this.data[i];
      if (beatData.bar === bar && beatData.beat === beat) {
        return beatData;
      }
    }
  };

  BassTrackSection.prototype.sound = function(bar, beat, subbeat, string) {
    var items = this.beat(bar, beat).data;
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (item.subbeat === subbeat && item.sound.string === string) {
        return item.sound;
      }
    }
  };

  BassTrackSection.prototype.beatSounds = function(beat) {
    return beat.data;
  };

  BassTrackSection.prototype.forEachSound = function(callback, obj) {
    if (obj) {
      callback = callback.bind(obj);
    }
    for (var i = 0; i < this.data.length; i++) {
      var beat = this.data[i];
      for (var j = 0; j < beat.data.length; j++) {
        var sound = beat.data[j].sound;
        var info = {
          bar: beat.bar,
          beat: beat.beat,
          subbeat: beat.data[j].subbeat
        };
        callback(sound, info);
      }
    }
  };

  // TDOD: remove all code - use setSection, loadBeats
  function BassSection(section) {
    this.section = section;
    this.type = 'bass';
    this.bars = [];
    this.setLength(section.length || 1);
  }

  BassSection.prototype.setSection = function(section) {
    this.section = section;
    this.setLength(section.length);
  };

  BassSection.prototype.loadBeats = function(beats) {

    // override selected section data
    beats.forEach(function(beat) {
      var destBeat = this.beat(beat.bar, beat.beat);
      destBeat.subdivision = beat.subdivision;
      beat.data.forEach(function(item) {
        var subbeat = this.subbeat(beat.bar, beat.beat, item.subbeat);
        angular.extend(subbeat[item.sound.string].sound, item.sound);
      }, this);
    }, this);

    // update references
    this.forEachBeat(function(beat) {
      this.updateBassReferences(beat.beat);
    }.bind(this));
  };

  BassSection.prototype.setLength = function(length) {
    console.log('bass: set length '+length);
    while (this.bars.length < length) {
      this._newBar();
    }
  };

  BassSection.prototype._newBar = function() {
    var barIndex = this.bars.length+1;
    var beats = [];
    var beat, subbeat;
    for (beat = 0; beat < 12; beat++) {
      var bassSubbeats = [];
      var bassBeat = {
        subdivision: 4,
        bar: barIndex,
        beat: beat+1,
        subbeats: []
      };
      for (subbeat = 0; subbeat < 4; subbeat++) {
        var bassSubbeatGrid = {};
        ['B', 'E', 'A', 'D', 'G'].forEach(function(string) {
          bassSubbeatGrid[string] = {
            sound: {}
          };
        });
        bassBeat.subbeats.push(bassSubbeatGrid);
      }
      beats.push(bassBeat);
    }
    this.bars.push(beats);
  };


  BassSection.prototype.beat = function(bar, beat) {
    return this.bars[bar-1][beat-1];
  };

  BassSection.prototype.subbeat = function(bar, beat, subbeat) {
    return this.bars[bar-1][beat-1].subbeats[subbeat-1];
  };

  BassSection.prototype.forEachBeat = function(callback, obj) {
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

  BassSection.prototype.forEachSubbeat = function(callback) {
    var bar, beat, barIndex, beatIndex;
    for (barIndex = 0; barIndex < this.section.length; barIndex++) {
      bar = this.bars[barIndex];
      for (beatIndex = 0; beatIndex < this.section.timeSignature.top ; beatIndex++) {
        beat = bar[beatIndex];
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

  BassSection.prototype.beatSounds = function(bassBeat) {
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


  BassSection.prototype.clearBeat = function(bassBeat) {
    bassBeat.subbeats.forEach(function(subbeat) {
      var string, bassSound;
      for (string in subbeat) {
        if (!string.startsWith('$')) {
          this.clearSound(subbeat[string].sound);
        }
      }
    }, this);
  };

  BassSection.prototype.clearSound = function(sound) {
    delete sound.style;
    delete sound.note;
    delete sound.noteLength;
    delete sound.prev;
    delete sound.next;
  };

  // update references
  BassSection.prototype.updateBassReferences = function(beat) {

    var sounds = this.beatSounds(beat);
    for (var i = 0; i < sounds.length; i++) {
      var sound = sounds[i].sound;

      var bass = this.instrument;

      if (sound.prev && angular.isUndefined(sound.prev.ref)) {
        Object.defineProperty(sound.prev, 'ref', {value: 'static', writable: true});
        sound.prev.ref = this.subbeat(sound.prev.bar, sound.prev.beat, sound.prev.subbeat)[sound.prev.string].sound;
      }
      if (sound.next && angular.isUndefined(sound.next.ref)) {
        Object.defineProperty(sound.next, 'ref', {value: 'static', writable: true});
        sound.next.ref = this.subbeat(sound.next.bar, sound.next.beat, sound.next.subbeat)[sound.next.string].sound;
      }
    }
  };

  BassSection.prototype.forEachSound = function(callback, obj) {
    this.forEachBeat(function(beat) {
      this.beatSounds(beat.beat).map(function(i) {return i.sound}).forEach(callback, obj);
    }, this);
  };

})();
