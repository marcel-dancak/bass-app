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
    'A♭': 'Ab',
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
      this.bufferLoader = new BufferLoader(context, soundsUrl);
      this.playingNotes = [];

      this.bass = {
        muted: false,
        audio: context.createGain()
      };
      this.drums = {
        muted: false,
        audio: context.createGain()
      };
    }

    var bassSounds = {
      finger: {
        getResources: function(sound) {
          var note = sound.note;
          if (note.type === 'ghost') {
            return ['sounds/bass/finger/X{0}'.format(sound.string+1)];
          }
          // return ['sounds/bass/finger/sine'.format(noteFileName[note.name], note.octave||'')];
          return ['sounds/bass/finger/{0}{1}'.format(noteFileName[note.name], note.octave||'')];
        }
      },/*
      hammer: {
        getResources: function(note) {
          return ['sounds/tap-{0}{1}'.format(noteFileName[note.name], note.octave||'')];
        }
      },
      slap: {
        getResources: function(note) {
          return ['sounds/slap-{0}{1}'.format(noteFileName[note.name], note.octave||'')];
        }
      },
      pull: {
        getResources: function(note) {
          return ['sounds/pull-{0}{1}'.format(noteFileName[note.name], note.octave||'')];
        }
      }*/
    };

    AudioPlayer.prototype._playDrumsSound = function(sound) {
      var audioData = this.bufferLoader.loadResource(sound.drum.filename);
      if (audioData) {
        var source = context.createBufferSource();
        source.buffer = audioData;
        var gain = context.createGain();
        gain.gain.value = sound.volume;
        source.connect(gain);
        gain.connect(this.drums.audio);
        source.start(context.currentTime, 0, sound.drum.duration);
      }
    };

    AudioPlayer.prototype._playBassSound = function(sound) {
      var note = sound.note;
      // console.log(note.style+' '+note.name);
      var source = context.createBufferSource();
      var gain = context.createGain();

      source.connect(gain);
      gain.connect(this.bass.audio);
      var audioData = this.bufferLoader.loadResource(bassSounds[sound.style].getResources(sound)[0]);
      //console.log(this.bufferLoader.loadedResources);
      if (audioData) {
        source.buffer = audioData;
        var duration = sound.noteLength.beatLength*(this.timeSignature.bottom)*this.beatTime;
        if (sound.noteLength.staccato) {
          duration = 0.92*duration-(this.beatTime/4)*0.2;
        }
        var startTime = context.currentTime;
        gain.gain.setValueAtTime(sound.volume, startTime);
        gain.gain.setValueAtTime(sound.volume, startTime+duration-0.05);

        var playingSound = {
          note: note,
          source: source,
          gain: gain,
          startTime: startTime,
          endTime: startTime+duration
        };
        if (note.type === 'slide') {
          /*
          var fft = 4096;
          // var processorNode = context.createJavaScriptNode(fft, 1, 1);
          var processorNode = context.createScriptProcessor(fft, 1, 1);

          var shifter = new Pitchshift(fft, context.sampleRate, 'FFT');
          shifter.shiftSteps = sound.slideFrets;
          shifter.shiftValue = 1;
          processorNode.onaudioprocess = function(event) {
            // Get left/right input and output arrays
            var outputArray = [];
            outputArray[0] = event.outputBuffer.getChannelData(0);
            var inputArray = [];
            inputArray[0] = event.inputBuffer.getChannelData(0);
            // console.log ("input is long: ", inputArray[0].length);
            var data = inputArray[0];
            shifter.process (this.shiftValue, data.length, 4, data);

            var out_data = outputArray[0];
            var i;
            for (i = 0; i < out_data.length; ++i) {
                out_data[i] = shifter.outdata[i];
            }
          }.bind(shifter);

          gain.disconnect();
          gain.connect(processorNode);
          processorNode.connect(this.bass.audio);
          playingSound.shifter = shifter;
          */

          source.start(startTime, 0, playingSound.endTime);
          gain.gain.linearRampToValueAtTime(0.001, playingSound.endTime);
          var semitoneRatio = Math.pow(2, 1/12);
          var endRate = Math.pow(semitoneRatio, note.slide || 0);
          source.playbackRate.setValueAtTime(1, startTime);
          source.playbackRate.linearRampToValueAtTime(endRate, playingSound.endTime);

        } else {
          source.start(startTime, 0, duration+0.05);
          gain.gain.linearRampToValueAtTime(0.001, playingSound.endTime);
        }
        this.playingNotes.push(playingSound);
        return playingSound;
      }
    };

    AudioPlayer.prototype.playback = function(arg) {
      var timeSignature = this.timeSignature;
      var barsCount = this.composition.length;
      if (this.playing) {
        var playTime = context.currentTime-this.startTime;
        if (playTime > this.subbeatIndex*this.beatTime/4) {
          var subbeat = (this.subbeatIndex % (4*timeSignature.top));
          if (subbeat % 4 === 0) {
            this.beatIndex++;
            if (this.beatIndex-1 === timeSignature.top) {
              this.beatIndex = 1;
              this.barIndex = (this.barIndex +1) % barsCount;
            }
            // console.log('bar: '+(this.barIndex+1)+' / '+barsCount);
            // console.log('beat: '+this.beatIndex);
            // console.log('subbeat: '+(subbeat+1));
            this.beatCallback(
              this.barIndex+1,
              this.beatIndex,
              this.bpm
            );
          }
          var drumsSounds = this.composition.drumsSubbeat(this.barIndex+1, this.beatIndex, (subbeat % 4)+1);
          var drumName;
          for (drumName in drumsSounds) {
            var sound = drumsSounds[drumName];
            if (sound.volume > 0) {
              this._playDrumsSound(sound);
            }
          };

          var stringsSounds = this.composition.bassSubbeat(this.barIndex+1, this.beatIndex, (subbeat % 4)+1)
          // console.log(stringsSounds);
          var string, sound;
          for (string = 0; string < 4; string++) {
            sound = stringsSounds[string].sound;
            if (!sound.style || !sound.note) {
              continue;
            }
            this._playBassSound(sound);
          }
          this.subbeatIndex++;
        }
        if (this.playingNotes.length) {
          var currentTime = context.currentTime;
          this.playingNotes = this.playingNotes.filter(function(playingNote) {
            if (currentTime > playingNote.endTime) {
              // maybe some cleanup
              // playingNote.gain.gain.value = 0.0001;
              return false;
            }
            return true;
          });
        }
        requestAnimationFrame(this.playback);
      }
    }

    AudioPlayer.prototype._play = function(composition) {
      this.playing = true;
      this.startTime = context.currentTime;
      this.subbeatIndex = 0;
      this.beatIndex = 0;
      this.barIndex = 0;
      this.composition = composition;
      this.playback();

      var oscillator = context.createOscillator();
      var oscGain = context.createGain();
      oscGain.gain.value = 0.0001;
      oscillator.connect(oscGain);
      oscGain.connect(this.bass.audio);
      oscillator.frequency.value = 0;
      oscillator.start();
      this.oscillator = oscillator;
    };

    AudioPlayer.prototype.setBpm = function(bpm) {
      this.bpm = bpm;
      this.beatTime = 60/bpm;
    }

    AudioPlayer.prototype.fetchSoundResources = function(sound) {
      if (sound.style && sound.note) {
        var resources = bassSounds[sound.style].getResources(sound);
        this.bufferLoader.loadResources(resources);
      }
    }

    AudioPlayer.prototype.play = function(section, beatCallback) {
      console.log('PLAY');
      var player = this;
      this.beatCallback = angular.isFunction(beatCallback)? beatCallback : angular.noop;
      function afterLoad() {
        player._play(section);
      }

      var resources = [];
      section.forEachBassSubbeat(function(subbeat) {
        var string;
        for (string = 0; string < 4; string++) {
          var bassSound = subbeat.data[string].sound;
          if (bassSound.note && bassSound.style) {
            var subbeatResources = bassSounds[bassSound.style].getResources(bassSound);
            subbeatResources.forEach(function(resource) {
              if (resources.indexOf(resource) === -1) {
                resources.push(resource);
              }
            });
          }
        }
      });
      console.log(resources);
      if (resources.length) {
        this.bufferLoader.loadResources(resources, afterLoad);
      } else {
        player._play(section);
      }
    };

    AudioPlayer.prototype.stop = function(noteLength) {
      this.playing = false;
      var currentTime = context.currentTime;
      this.playingNotes.forEach(function(playingNote) {
        playingNote.gain.gain.cancelScheduledValues(currentTime);
        playingNote.gain.gain.setValueAtTime(playingNote.gain.gain.value, currentTime);
        playingNote.gain.gain.linearRampToValueAtTime(0.0001, currentTime+0.05);
      });
      this.oscillator.stop();
    };

    AudioPlayer.prototype.playSound = function(bassSound) {
      if (!this.timeSignature) {
        this.timeSignature = {top:4, bottom: 4};
      }
      var resources = bassSounds[bassSound.style].getResources(bassSound);
      var player = this;
      if (player.playingBassSample && player.playingBassSample.source.playing) {
        var currentTime = context.currentTime;
        player.playingBassSample.gain.gain.cancelScheduledValues(currentTime);
        player.playingBassSample.gain.gain.setValueAtTime(player.playingBassSample.gain.gain.value, currentTime);
        player.playingBassSample.gain.gain.linearRampToValueAtTime(0.0001, currentTime+0.05);
      }
      function afterLoad(audioBuffer) {
        setTimeout(function() {
          player.playingBassSample = player._playBassSound(bassSound);
          player.playingBassSample.source.playing = true;
          player.playingBassSample.source.addEventListener('ended', function(evt) {
            evt.target.playing = false;
          });
        }, 50);
      }
      this.bufferLoader.loadResource(resources[0], afterLoad);
    };

    return new AudioPlayer();
  }
})();