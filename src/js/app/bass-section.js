(function() {
  'use strict';

  angular
    .module('bd.app')
    .value('BassSection', BassSection);

  function BassSection(bass, section) {
    this.section = section;
    this.type = 'bass';
    this.bass = bass;
    this.bars = [];
    this.setLength(section.length || 1);
  }

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

  BassSection.prototype.forEachBeat = function(callback) {
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

  BassSection.prototype.getSounds = function(bassBeat) {
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

    var sounds = this.getSounds(beat);
    for (var i = 0; i < sounds.length; i++) {
      var sound = sounds[i].sound;

      var bass = this.bass;//new Bass("EADG");
      var index2Label = ['E', 'A', 'D', 'G'];
      if (Number.isInteger(sound.string)) {
        sound.string = index2Label[sound.string]; // temporarty conversion for backward compatibility
      }
      sound.string = bass.strings[sound.string];
      // temporarty conversion for backward compatibility
      if (sound.next && Number.isInteger(sound.next.string)) {
        sound.next.string = index2Label[sound.next.string];
      }
      if (sound.prev && Number.isInteger(sound.prev.string)) {
        sound.prev.string = index2Label[sound.prev.string];
      }


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

})();
