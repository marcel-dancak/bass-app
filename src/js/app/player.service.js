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

    AudioPlayer.prototype._playBassSound = function(sound, timeSignature, beatTime) {
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
        var duration = sound.noteLength.beatLength*(timeSignature.bottom)*beatTime;
        if (sound.noteLength.staccato) {
          duration = 0.92*duration-(beatTime/4)*0.2;
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
      if (this.playing) {
        var timeSignature = this.composition.timeSignature;
        var currentTime = context.currentTime;
        var beatElapsedTime = currentTime - this.currentBeat.startTime;

        if (beatElapsedTime >= this.beatTime) {
          var wasLastBeatInBar = this.currentBeat.beatIndex+1 === timeSignature.top;
          var wasLastBar = wasLastBeatInBar && this.currentBeat.barIndex+1 === this.composition.length;
          this.currentBeat = {
            barIndex: wasLastBar? 0 : wasLastBeatInBar? this.currentBeat.barIndex+1 : this.currentBeat.barIndex,
            beatIndex: wasLastBeatInBar? 0 : this.currentBeat.beatIndex+1,
            bassSubbeatIndex: 0,
            drumsSubbeatIndex: 0,
            startTime: this.currentBeat.startTime+this.beatTime
          };
          beatElapsedTime = currentTime - this.currentBeat.startTime;
          this.beatCallback(
            this.currentBeat.barIndex+1,
            this.currentBeat.beatIndex+1,
            this.bpm
          );
        }
        if (beatElapsedTime >= this.currentBeat.drumsSubbeatIndex*this.beatTime/4) {
          // play drums subbeats
          var drumsSounds = this.composition.drumsSubbeat(
            this.currentBeat.barIndex+1,
            this.currentBeat.beatIndex+1,
            this.currentBeat.drumsSubbeatIndex+1
          );
          var drumName;
          for (drumName in drumsSounds) {
            var sound = drumsSounds[drumName];
            if (sound.volume > 0) {
              this._playDrumsSound(sound);
            }
          };
          this.currentBeat.drumsSubbeatIndex++;
        }

        var bassBeat = this.composition.bassBeat(this.currentBeat.barIndex+1, this.currentBeat.beatIndex+1);
        if (beatElapsedTime >= this.currentBeat.bassSubbeatIndex*this.beatTime/bassBeat.subdivision) {
          // play bass subbeats
          var stringsSounds = this.composition.bassSubbeat(
            this.currentBeat.barIndex+1,
            this.currentBeat.beatIndex+1,
            this.currentBeat.bassSubbeatIndex+1
          );
          // console.log(stringsSounds);
          var string, sound;
          for (string = 0; string < 4; string++) {
            sound = stringsSounds[string].sound;
            if (!sound.style || !sound.note) {
              continue;
            }

            var beatTime = bassBeat.subdivision === 3? this.beatTime*(2/3) : this.beatTime;
            this._playBassSound(sound, this.composition.timeSignature, beatTime);
          }
          this.currentBeat.bassSubbeatIndex++;
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
      // setup 'silent' source, it's needed for proper graph
      // visualization when no other source is playing
      var oscillator = context.createOscillator();
      var oscGain = context.createGain();
      oscGain.gain.value = 0.0001;
      oscillator.connect(oscGain);
      oscGain.connect(this.bass.audio);
      oscillator.frequency.value = 0;
      oscillator.start();
      this.oscillator = oscillator;

      this.composition = composition;
      this.currentBeat = {
        barIndex: 0,
        beatIndex: 0,
        bassSubbeatIndex: 0,
        drumsSubbeatIndex: 0,
        startTime: context.currentTime
      };
      this.beatCallback(
        this.currentBeat.barIndex+1,
        this.currentBeat.beatIndex+1,
        this.bpm
      );
      this.playback();
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
          player.playingBassSample = player._playBassSound(bassSound, {top:4, bottom: 4}, 0.25);
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