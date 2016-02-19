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

  function audioPlayer(context) {

    function AudioPlayer() {
      this.playing = false;
    }

    var source1, source2, source3, source4;
    var gain1, gain2, gain3, gain4;
    var bufferLoader;


    var bassSounds = {
      finger: {
        getResources: function(note) {
          if (note.name === 'x') {
            return ['sounds/finger/ogg/X{1}'.format(noteFileName[note.name], '1')];
          }
          return ['sounds/finger/ogg/{0}{1}'.format(noteFileName[note.name], note.octave||'')];
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
          var subbeat = (this.subbeatIndex % 16) + 1;
          // console.log('subbeat: '+subbeat);
          var note = this.bar.subbeats[this.subbeatIndex].note;
          if (note.style && note.name) {
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
            duration = 1.1*duration;
            var startTime = context.currentTime;
            source.start(startTime, 0, duration);
            var sound = {
              note: note,
              source: source,
              gain: gain,
              startTime: startTime,
              endTime: startTime+duration,
              fadeIn: note.name === 'x'? 0 : 60,
              fadeOut: note.name === 'x'? 0 : 60
            };
            this.playingNotes.push(sound);
          }
          this.subbeatIndex++;
        }
        if (this.playingNotes.length) {
          var currentTime = context.currentTime;
          this.playingNotes = this.playingNotes.filter(function(playingNote) {
            if (currentTime > playingNote.endTime) {
              // maybe some cleanup
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
        requestAnimationFrame(this.playback.bind(this));
      }
    }

    AudioPlayer.prototype._play = function(bar, bpm) {
      this.playing = true;
      this.startTime = context.currentTime;
      var beatTime = 60/bpm;
      this.subbeatTime = beatTime/4;
      this.subbeatIndex = 0;
      this.bar = bar;
      this.playback();
      return;

      var noteLength = 0.5;
      var noteMutingTime = 0.025+noteLength*0.1;
      var noteMutingStep = 0.01/noteMutingTime; // 10ms constant for fade-out timer

      var startTime = context.currentTime;
      gain1.gain.value = 1;
      console.log(this.destination);
      gain1.connect(this.destination);
      
      source1.start(startTime, 0, noteLength);
      fadeOut(gain1.gain, noteLength-0.02, 0.1);


      gain2.gain.value = 0.5;
      gain2.connect(this.destination);
      source2.start(startTime+noteLength-0.05, 0, noteLength+0.05);
      fadeOut(gain2.gain, 2*noteLength-noteMutingTime, noteMutingStep);

      gain3.gain.value = 0.8;
      gain3.connect(this.destination);
      source3.start(startTime+2*noteLength, 0, noteLength);
      fadeOut(gain3.gain, 3*noteLength-noteMutingTime, noteMutingStep);

      gain4.gain.value = 0.8;
      gain4.connect(this.destination);
      source4.start(startTime+3*noteLength, 0, noteLength);
      fadeOut(gain4.gain, 4*noteLength-noteMutingTime, noteMutingStep);
    };

    AudioPlayer.prototype.play = function(bar, bpm) {
      var player = this;
      console.log(bar);
      function afterLoad(bufferList) {
        player._play(bar, bpm);
      }

      var resources = [];
      var resourcesIndexes = {};
      bar.subbeats.forEach(function(subbeat) {
        if (subbeat.note.style) {
          console.log('get resources: '+subbeat.note.style);
          var subbeatResources = bassSounds[subbeat.note.style].getResources(subbeat.note);
          var filename;
          subbeatResources.forEach(function(resource) {
            filename = resource+'.ogg'
            if (resources.indexOf(filename) === -1) {
              resourcesIndexes[resource] = resources.length;
              resources.push(filename);
            }
          });
        }
      });
      console.log(resources);
      console.log(resourcesIndexes);
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
    }

    return new AudioPlayer();
  }
})();