(function() {
  'use strict';

  angular
    .module('bd.app')
    .factory('DrumSection', drumSection)
    .factory('DrumTrackSection', drumTrackSection);


  function drumTrackSection(TrackSection) {
    class DrumTrackSection extends TrackSection {
      constructor(section, data) {
        super(section, data);
        this.type = 'drums';
      }
      /*
      forEachSound(callback, obj) {
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
      }*/
    }
    return DrumTrackSection;
  }


  function drumSection(EditableTrackSection, DrumTrackSection) {

    class DrumSection extends EditableTrackSection {
      constructor(section) {
        super(section, DrumTrackSection);
        this.type = 'drums';
      }

      _createSubbeatData() {
        var drumSubbeatGrid = {};
        for (var i = 0; i < 8; i++) {
          drumSubbeatGrid[i] = {
            volume: 0.0
          }
        }
        return drumSubbeatGrid;
      }

      loadBeats(beats) {
        var nameToIndex = {};
        this.instrument.forEach(function(drum, index) {
          nameToIndex[drum.name] = index;
        });
        // override selected section data
        beats.forEach(function(beat) {
          var destBeat = this.beat(beat.bar, beat.beat);
          destBeat.subdivision = beat.subdivision;
          destBeat.meta = beat.meta;
          beat.data.forEach(function(sound) {
            if (nameToIndex.hasOwnProperty(sound.drum)) {
              var subbeat = this.subbeat(beat.bar, beat.beat, sound.subbeat);
              subbeat[nameToIndex[sound.drum]].volume = sound.volume;
            } else {
              console.log('Unknown drum sound: '+sound.drum);
            }
          }, this);
        }, this);
      }

      beatSounds(drumsBeat) {
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
      }

      clearSound(gridCell) {
        gridCell.volume = 0;
      }

      forEachSound(callback, obj) {
        this.forEachBeat(function(beat) {
          this.beatSounds(beat).forEach(callback, obj);
        }, this);
      }

    }

    return DrumSection;
  }

})();
