(function() {
  'use strict';

  angular
    .module('bd.app')
    .factory('audioPlayer', audioPlayer);

  var noteFileName = {
    'C' : 'C',
    'C♯': 'Db',
    'D♭': 'Db',
    'D' : 'D',
    'D♯': 'Eb',
    'E♭': 'Eb',
    'E' : 'E',
    'F' : 'F',
    'F♯': 'Gb',
    'G♭': 'Gb',
    'G' : 'G',
    'G♯': 'Ab',
    'A' : 'A',
    'A♯': 'Bb',
    'B♭': 'Bb',
    'B' : 'B'
  };

  function audioPlayer(context, soundsUrl) {

    function AudioPlayer() {
      this.playing = false;
      this.playback = this.playback.bind(this);
      this.setBpm(60);
    }

    var source1, source2, source3, source4;
    var gain1, gain2, gain3, gain4;
    var bufferLoader;


    var bassSounds = {
      finger: {
        getResources: function(note) {
          if (note.name === 'x') {
            return ['sounds/finger/X{1}'.format(noteFileName[note.name], '1')];
          }
          return ['sounds/finger/{0}{1}'.format(noteFileName[note.name], note.octave||'')];
        },
        play: function(note, bpm) {
          console.log('playing ... '+note.name);
        }
      },
      hammer: {
        getResources: function(note) {
          return ['sounds/tap-{0}{1}'.format(noteFileName[note.name], note.octave||'')];
        },
        play: function(note, bpm) {
          console.log('playing ... '+note.name);
        }
      },
      slap: {
        getResources: function(note) {
          return ['sounds/slap-{0}{1}'.format(noteFileName[note.name], note.octave||'')];
        },
        play: function(note, bpm) {
          console.log('slapping ... '+note.name);
        }
      },
      pull: {
        getResources: function(note) {
          return ['sounds/pull-{0}{1}'.format(noteFileName[note.name], note.octave||'')];
        }
      }
    };

    function fadeOutCallbback(gain, step) {
      gain.value -= step;
      if (gain.value > 0) {
        setTimeout(fadeOutCallbback, 10, gain, step);
      }
    }

    function fadeOut(gain, delay, step) {
      setTimeout(fadeOutCallbback, delay*1000, gain, step);
    }

    AudioPlayer.prototype.initialize = function(destination) {
      this.destination = destination;
      this.playingNotes = [];
    };


    AudioPlayer.prototype.playback = function(arg) {
      if (this.playing) {
        var playTime = context.currentTime-this.startTime;
        if (playTime > this.subbeatIndex*this.subbeatTime) {
          var subbeat = (this.subbeatIndex % 16);
          if (subbeat % 4 === 0) {
            this.beatCallback(this.bpm, (this.beatIndex % 4)+1);
            this.beatIndex++;
          }
          // console.log('subbeat: '+subbeat);
          var stringsNotes = this.bar.notes[subbeat];
          var notes = stringsNotes.filter(function(noteItem) {
            if (!noteItem.note.style || !noteItem.note.name) {
              return;
            }
            var note = noteItem.note;
            // console.log(note.style+' '+note.name);
            // console.log(note);
            var source = context.createBufferSource();
            var gain = context.createGain();
            gain.gain.value = 0;
            source.connect(gain);
            gain.connect(this.destination);
            source.buffer = bufferLoader.getAudioData(bassSounds[note.style].getResources(note)[0]);
            var duration = note.length? this.subbeatTime*note.length*16 : this.subbeatTime;
            if (note.dotted) {
              duration *= 1.5;
            }
            if (note.staccato) {
              duration = 0.8*duration;
            }
            duration = duration;
            var startTime = context.currentTime;
            source.start(startTime, 0, duration+50);
            var sound = {
              note: note,
              source: source,
              gain: gain,
              startTime: startTime,
              endTime: startTime+duration,
              fadeIn: 0,
              fadeOut: note.name === 'x'? 0 : 30
            };
            this.playingNotes.push(sound);
          }, this);
          this.subbeatIndex++;
        }
        if (this.playingNotes.length) {
          var currentTime = context.currentTime;
          this.playingNotes = this.playingNotes.filter(function(playingNote) {
            if (currentTime > playingNote.endTime) {
              // maybe some cleanup
              playingNote.gain.gain.value = 0.0;
              return false;
            }
            return true;
          });
          this.playingNotes.forEach(function(playingNote) {
            var timeElapsed = 1000*(currentTime-playingNote.startTime);
            if (timeElapsed < playingNote.fadeIn) {
              playingNote.gain.gain.value = (timeElapsed/playingNote.fadeIn)*playingNote.note.volume;
            } else {
              var timeRemaining = 1000*(playingNote.endTime - currentTime);
              if (timeRemaining < playingNote.fadeOut) {
                playingNote.gain.gain.value = (timeRemaining/playingNote.fadeOut)*playingNote.note.volume;
              } else {
                playingNote.gain.gain.value = playingNote.note.volume;
              }
            }
          });
        }
        requestAnimationFrame(this.playback);
      }
    }

    AudioPlayer.prototype._play = function(bar) {
      this.playing = true;
      this.startTime = context.currentTime;
      this.subbeatIndex = 0;
      this.beatIndex = 0;
      this.bar = bar;
      this.playback();
    };

    AudioPlayer.prototype.setBpm = function(bpm) {
      this.bpm = bpm;
      var beatTime = 60/bpm;
      this.subbeatTime = beatTime/4;
    }

    AudioPlayer.prototype.play = function(bar, beatCallback) {
      var player = this;
      this.beatCallback = angular.isFunction(beatCallback)? beatCallback : angular.noop;
      function afterLoad(bufferList) {
        player._play(bar);
      }

      var resources = [];
      var resourcesIndexes = {};
      var subbeat, string;
      for (subbeat=0; subbeat<16; subbeat++) {
        for (string=0; string<4; string++) {
          var note = bar.notes[subbeat][string].note;
          if (note.name && note.style) {
            var subbeatResources = bassSounds[note.style].getResources(note);
            var filename;
            subbeatResources.forEach(function(resource) {
              filename = soundsUrl+resource+'.ogg'
              if (resources.indexOf(filename) === -1) {
                resourcesIndexes[resource] = resources.length;
                resources.push(filename);
              }
            });
          }
        }
      }
      bufferLoader = new BufferLoader(
        context,
        resources,
        afterLoad
      );
      bufferLoader.getAudioData = function(resource) {
        return bufferLoader.bufferList[resourcesIndexes[resource]];
      };
      bufferLoader.load();
    };

    AudioPlayer.prototype.stop = function(noteLength) {
      this.playing = false;
      this.playingNotes.forEach(function(playingNote) {
        playingNote.gain.gain.value = 0;
        // playingNote.source.stop();
      });
    }

    return new AudioPlayer();
  }
})();