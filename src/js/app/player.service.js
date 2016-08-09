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

  function audioPlayer($timeout, $http, context, soundsUrl, Observable, AudioComposer) {

    function AudioPlayer() {
      Observable.call(this, ["playbackStarted", "playbackStopped"]);
      this.playing = false;
      this.countdown = false;
      this.setBpm(60);
      this.bufferLoader = new BufferLoader(context, soundsUrl);
      this.scheduledSounds = [];

      this.bass = {
        muted: false,
        audio: context.createGain()
      };
      this.drums = {
        muted: false,
        audio: context.createGain()
      };
      this.input = {
        muted: true,
        audio: context.createGain()
      };
      this.drums.audio.gain.value = 0.65;
      this.input.audio.gain.value = 0.001;
      this.bufferLoader.loadResource('sounds/drums/drumstick');

      var _this = this;
      this.soundHandlers = [
        {
          accepts: function(sound) {
            return sound.style === 'hammer' || sound.style === 'pull';
          },
          getResources: function(sound) {
            var rootSound = sound;
            while (rootSound.prev) {
              rootSound = rootSound.prev.ref;
            }
            return ['sounds/bass/{0}/{1}{2}'.format(rootSound.style, sound.string.label, sound.note.fret)];
          },
          transitionPlayback: function(stack, sound, startTime, beatTime, timeSignature) {
            /*
            var prevAudio = stack.pop();
            var audio = _this.createSoundAudio(sound, startTime);
            audio = _this.composer.join(prevAudio, audio);
            audio.gain.setValueAtTime(sound.volume, startTime);
            var duration = _this.noteDuration(sound, beatTime, timeSignature);
            audio.duration += duration;
            audio.endTime += duration;

            audio.gain.setValueAtTime(audio.sound.volume, audio.startTime);
            stack.push(audio);
            */

            // var prevAudio = stack.pop();
            var prevAudio = stack[stack.length-1];
            var audio = _this.createSoundAudio(sound, startTime);
            var duration = _this.noteDuration(sound, beatTime, timeSignature);
            audio.duration = duration;
            audio.endTime = startTime + duration;
            _this.composer.join(prevAudio, audio);
            stack.push(audio);
          }
        }, {
          accepts: function(sound) {
            return sound.note.type === 'slide';
          },
          getResources: function(sound) {
            var rootSound = sound;
            while (rootSound.prev) {
              rootSound = rootSound.prev.ref;
            }
            var step = sound.note.fret > sound.note.slide.endNote.fret? -1 : 1;
            var outOfRange = sound.note.slide.endNote.fret + step;
            var resources = [];
            for (var i = sound.note.fret; i !== outOfRange; i += step) {
              resources.push('sounds/bass/{0}/{1}{2}'.format(rootSound.style, sound.string.label, i));
            }
            return resources;
          },
          slideCurve: function(sound, beatTime, timeSignature, slideStartOffset, slideEndOffset) {
            var duration = _this.noteDuration(sound, beatTime, timeSignature);
            var steps = Math.abs(sound.note.fret-sound.note.slide.endNote.fret);
            var curve = new Array(steps+2);
            curve[0] = Math.max(duration*slideStartOffset, 0.02);
            curve[curve.length-1] = Math.max(duration*slideEndOffset, 0.02);
            var stepDuration = (duration-curve[0]-curve[curve.length-1])/steps;
            curve.fill(stepDuration, 1, 1+steps);
            return curve;
          },
          prepareForPlayback: function(sound, startTime, beatTime, timeSignature) {
            var curve = this.slideCurve(sound, beatTime, timeSignature, 0.2, 0.2);
            var audioStack = _this.composer.createSlide(null, sound, curve, startTime, beatTime, timeSignature);
            return audioStack;
          },
          transitionPlayback: function(stack, sound, startTime, beatTime, timeSignature) {
            var prevAudio = stack.pop();
            var curve = this.slideCurve(sound, beatTime, timeSignature, 0.05, 0.15);
            var audioSounds = _this.composer.createSlide(prevAudio, sound, curve, startTime, beatTime, timeSignature);
            Array.prototype.push.apply(stack, audioSounds);
          }
        }, {
          accepts: function(sound) {
            return sound.style === 'ring';
          },
          getResources: function(sound) {
            return [];
          },
          prepareForPlayback: function(sound, startTime, beatTime, timeSignature) {
            // error
          },
          transitionPlayback: function(stack, sound, startTime, beatTime, timeSignature) {
            var prevAudio = stack[stack.length-1];
            // console.log(prevAudio.endTime+' vs '+startTime);
            var duration = _this.noteDuration(sound, beatTime, timeSignature);
            prevAudio.duration += duration;
            prevAudio.endTime += duration;
            prevAudio.gain.setValueAtTime(sound.volume, startTime);
          }
        },
        {
          accepts: function(sound) {
            return sound.note.type === 'grace';
          },
          getResources: function(sound) {
            return ['sounds/bass/{0}/{1}{2}'.format(sound.style, sound.string.label, sound.note.fret-2)];
          },
          prepareForPlayback: function(sound, startTime, beatTime, timeSignature) {
            var audio = _this.createSoundAudio(sound, startTime);
            var duration = _this.noteDuration(sound, beatTime, timeSignature);

            var startRate = Math.pow(Math.pow(2, 1/12), -2);
            audio.source.playbackRate.setValueAtTime(startRate, startTime);
            audio.source.playbackRate.setValueAtTime(1, startTime+0.075);

            audio.duration = duration;
            audio.endTime = startTime+duration;
            return [audio];
          }
        },
        {
          accepts: function(sound) {
            return sound.note.type === 'ghost';
          },
          getResources: function(sound) {
            return ['sounds/bass/{0}/{1}X'.format(sound.style, sound.string.label)];
          },
          prepareForPlayback: function(sound, startTime, beatTime, timeSignature) {
            var audio = _this.createSoundAudio(sound, startTime);
            audio.duration = 0.25;
            audio.endTime = startTime + audio.duration;
            return [audio];
          }
        },
        {
          accepts: function(sound) {
            return sound.note.type === 'regular';
          },
          getResources: function(sound) {
            console.log('sounds/bass/{0}/{1}{2}'.format(sound.style, sound.string.label, sound.note.fret));
            return ['sounds/bass/{0}/{1}{2}'.format(sound.style, sound.string.label, sound.note.fret)];
          },
          prepareForPlayback: function(sound, startTime, beatTime, timeSignature) {
            console.log(sound);
            var audio = _this.createSoundAudio(sound, startTime);
            var duration = _this.noteDuration(sound, beatTime, timeSignature);
            audio.duration = duration;
            audio.endTime = startTime+duration;
            return [audio];
          }
        }
      ];

      this.composer = new AudioComposer(context, this);
      // TEST
      // this.composer.generateSamples('finger_E0-12', 'E', 0);
      // this.composer.test();
    }

    AudioPlayer.prototype = Object.create(Observable.prototype);

    AudioPlayer.prototype._playDrumStick = function(sound) {
      var audioData = this.bufferLoader.loadResource('sounds/drums/drumstick');
      var source = context.createBufferSource();
      source.buffer = audioData;
      source.connect(context.destination);
      source.start(context.currentTime, 0, 0.2);
    };

    AudioPlayer.prototype._playDrumsSound = function(sound, startTime) {
      var audioData = this.bufferLoader.loadResource(sound.drum.filename);
      if (audioData) {
        var source = context.createBufferSource();
        source.buffer = audioData;
        var gain = context.createGain();
        gain.gain.value = sound.volume;
        source.connect(gain);
        gain.connect(this.drums.audio);
        source.start(startTime, 0, sound.drum.duration);
      }
    };

    AudioPlayer.prototype.createSoundAudio = function(sound, startTime, index) {
      var resources = this._getSoundHandler(sound).getResources(sound);
      var audioData = resources? this.bufferLoader.loadResource(resources[index || 0]) : null;

      if (audioData) {

        var source = context.createBufferSource();
        var gain = context.createGain();
        source.connect(gain);
        gain.connect(this.bass.audio);
        source.buffer = audioData;
        return {
          sound: sound,
          source: source,
          gain: gain.gain,
          output: gain,
          startTime: startTime,
          endTime: startTime,
          duration: 0,
          offset: 0
        }
      } else {
        console.log('error '+resources);
      }
    }

    AudioPlayer.prototype.noteDuration = function(sound, beatTime, timeSignature) {
      var duration;
      if (sound.note.type === 'ghost') {
        duration = 0.25;
      } else {
        duration = sound.noteLength.beatLength*(timeSignature.bottom)*beatTime;
        if (sound.noteLength.staccato) {
          duration = 0.95*duration-(beatTime/4)*0.2;
        }
      }
      return duration;
    };


    AudioPlayer.prototype._getSoundHandler = function(sound) {
      for (var i = 0; i < this.soundHandlers.length; i++) {
        var handler = this.soundHandlers[i];
        if (handler.accepts(sound)) {
          return handler;
        }
      }
    };

    AudioPlayer.prototype._playBassSound = function(sound, startTime, beatTime, timeSignature) {
      if (sound.prev) {
        return;
      }
      var stack = this._getSoundHandler(sound).prepareForPlayback(sound, startTime, beatTime, timeSignature);

      var audio = stack[0];
      audio.gain.setValueAtTime(audio.sound.volume, startTime);

      if (sound.next) {
        var nextSound = sound.next.ref;
        while (nextSound) {
          this._getSoundHandler(nextSound).transitionPlayback(stack, nextSound, audio.endTime, beatTime, timeSignature);
          audio = stack[stack.length-1];
          nextSound = nextSound.next? nextSound.next.ref : null;
        }
      }

      audio = stack[stack.length-1];
      var endVolume = audio.slide? audio.slide.volume : audio.sound.volume;
      audio.gain.setValueAtTime(endVolume, audio.endTime-0.015);
      audio.gain.linearRampToValueAtTime(0.00001, audio.endTime);
      // audio.duration += 0.01;

      for (var i = 0; i < stack.length; i++) {
        var a = stack[i];
        a.source.start(a.startTime, a.offset, a.duration);
        this.scheduledSounds.push(a);
      }
      return audio;
    }

    AudioPlayer.prototype.playBeat = function(bar, beat, startTime) {
      if (!this.playing) return;

      var isFinalBeat = (bar === 1 && beat === 1 && this.repeats === 0);
      var timeSignature = this.composition.timeSignature;
      var currentTime = context.currentTime;
      var beatTime = 60/this.bpm;

      if (!isFinalBeat) {
        // console.log('Play beat: '+beat);

        var bassBeat = this.composition.bassBeat(bar, beat);
        var bassSounds = this.composition.getBassSounds(bassBeat);
        var noteBeatTime = bassBeat.subdivision === 3? beatTime*(2/3) : beatTime;

        bassSounds.forEach(function(subbeatSound) {
          var startAt = startTime + (beatTime / bassBeat.subdivision * (subbeatSound.subbeat - 1));
          this._playBassSound(subbeatSound.sound, startAt, noteBeatTime, timeSignature);
        }.bind(this));

        var drumsBeat = this.composition.drumsBeat(bar, beat);
        var drumsSounds = this.composition.getDrumsSounds(drumsBeat);
        drumsSounds.forEach(function(subbeatSound) {
          var startAt = startTime + (beatTime / 4 * (subbeatSound.subbeat - 1));
          // replace 'incomplete' drum sound object from Section.getDrumsSounds
          var sound = this.composition.drumsSubbeat(drumsBeat.bar, drumsBeat.beat, subbeatSound.subbeat)[subbeatSound.drum];
          this._playDrumsSound(sound, startAt);
        }.bind(this));
      }

      var flatIndex = (bar-1)*this.composition.timeSignature.top+beat-1;
      if (flatIndex === 0) {
        this.repeats--;
      }
      this.beatPreparedCallback({
        bar: bar,
        beat: beat,
        eventTime: currentTime,
        startTime: startTime,
        endTime: startTime+beatTime,
        duration: beatTime,
        timeSignature: this.composition.timeSignature,
        flatIndex: flatIndex,
        playbackActive: !isFinalBeat
      });

      if (this.scheduledSounds.length) {
        this.scheduledSounds = this.scheduledSounds.filter(function(playingNote) {
          return currentTime <= playingNote.endTime;
        });
      }

      if (isFinalBeat) {
        $timeout(function() {
          this.stop();
        }.bind(this), 1000*(startTime - currentTime));
      } else {
        var isLastBeatInBar = beat === timeSignature.top;
        var isLastBar = isLastBeatInBar && bar === (this.lastBar || this.composition.length);
        var nextBar = isLastBar? this.firstBar || 1 : isLastBeatInBar? bar+1 : bar;
        var nextBeat = isLastBeatInBar? 1 : beat+1;
        var nextBeatStart = startTime+beatTime;

        if (nextBeatStart < currentTime+0.075) {
          // console.log('PROBLEM !!!');
          this.stop();
          return;
        }
        // console.log(nextBeatStart-currentTime);
        // setup next beat's sounds some time ahead
        var schedule = 1000*(nextBeatStart - currentTime - 0.2);
        schedule = Math.max(schedule, 75);
        this.lastSyncTimerId = setTimeout(this.playBeat.bind(this), schedule, nextBar, nextBeat, nextBeatStart);
      }
    };

    AudioPlayer.prototype._play = function() {
      // setup 'silent' source. It's needed for proper graph
      // visualization when no other source is playing
      var oscillator = context.createOscillator();
      var gain = context.createGain();
      gain.gain.value = 0.0001;
      // gain.gain.value = 0.33;
      oscillator.frequency.value = 40;
      oscillator.output = gain;
      oscillator.connect(gain);
      oscillator.output.connect(this.bass.audio);
      this.oscillator = oscillator;

      oscillator.start();
      var bar = this.firstBar || 1;
      this.playBeat(bar, 1, context.currentTime);
    };

    AudioPlayer.prototype.setBpm = function(bpm) {
      this.bpm = bpm;
      this.beatTime = 60/bpm;
    }

    AudioPlayer.prototype.fetchSoundResources = function(sound) {
      if (sound.style && sound.note) {
        var resources = this._getSoundHandler(sound).getResources(sound);
        this.bufferLoader.loadResources(resources);
      }
    }

    AudioPlayer.prototype.play = function(section, beatPreparedCallback, repeats) {
      console.log('PLAY');
      this.composition = section;
      this.playing = true;
      this.lastSyncTimerId = 0;
      this.repeats = repeats || 1;

      var player = this;
      this.beatPreparedCallback = angular.isFunction(beatPreparedCallback)? beatPreparedCallback : angular.noop;
      function afterLoad() {
        var count = player.countdown? 3 : 0;
        function countdown() {
          if (count > 0) {
            count--;
            if (player.playing) {
              player._playDrumStick();
              setTimeout(countdown, 60000/player.bpm);
            }
          } else {
            player._play();
          }
        }
        countdown();
      }

      var resources = [];

      var stringsCount = Object.keys(section.bassSubbeat(1, 1, 1)).length;
      section.forEachBassSubbeat(function(subbeat) {
        for (var string = 0; string < stringsCount; string++) {
        // for (var string in subbeat.data) {
          var bassSound = subbeat.data[string].sound;
          if (bassSound.note && bassSound.style) {
            var subbeatResources = player._getSoundHandler(bassSound).getResources(bassSound);
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
        afterLoad();
      }
    };

    AudioPlayer.prototype.stop = function(noteLength) {
      this.playing = false;
      if (this.lastSyncTimerId) {
        clearTimeout(this.lastSyncTimerId);
      }
      var currentTime = context.currentTime;
      this.scheduledSounds.forEach(function(sound) {
        if (currentTime < sound.startTime) {
          sound.source.stop();
        } else {
          sound.gain.cancelScheduledValues(currentTime);
          // sound.gain.setValueAtTime(sound.gain.value, currentTime);
          // sound.gain.linearRampToValueAtTime(0.0001, currentTime+0.05);
        }
      });
      this.oscillator.stop();
      this.oscillator.disconnect();
      this.oscillator.output.disconnect();
      this.dispatchEvent('playbackStopped');
    };

    AudioPlayer.prototype.playBassSample = function(bassSound) {
      var resources = this._getSoundHandler(bassSound).getResources(bassSound);

      if (bassSound.next) {
        var nextSound = bassSound;
        while (nextSound.next) {
          var nextResources = this._getSoundHandler(nextSound.next.ref).getResources(nextSound.next.ref);
          nextResources.forEach(function(resource) {
            if (resources.indexOf(resource) === -1) {
              resources.push(resource);
            }
          });
          nextSound = nextSound.next.ref;
        }
      }
      console.log(resources);

      var player = this;
      if (player.playingBassSample && player.playingBassSample.source.playing) {
        var currentTime = context.currentTime;
        player.playingBassSample.gain.cancelScheduledValues(currentTime);
        player.playingBassSample.gain.setValueAtTime(player.playingBassSample.gain.value, currentTime);
        player.playingBassSample.gain.linearRampToValueAtTime(0.0001, currentTime+0.05);
      }
      function afterLoad(audioBuffer) {
        setTimeout(function() {
          player.playingBassSample = player._playBassSound(
            bassSound,
            context.currentTime,
            60/player.bpm,
            { top: 4, bottom: 4 }
          );
          player.playingBassSample.source.playing = true;
          player.playingBassSample.source.addEventListener('ended', function(evt) {
            evt.target.playing = false;
          });
        }, 50);
      }
      this.bufferLoader.loadResources(resources, afterLoad);
    };

    AudioPlayer.prototype.playDrumSample = function(drumSound) {
      this._playDrumsSound(drumSound, context.currentTime);
    };

    return new AudioPlayer();
  }
})();