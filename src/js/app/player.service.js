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

  function audioPlayer($timeout, $http, context, Observable, soundsUrl) {

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
      this.bassSounds = {
        meta: {
          pop: 'sounds/bass/pop/metadata.json',
          slap: 'sounds/bass/slap/metadata.json'
        },
        metadata: {},
        getResources: function(sound) {
          var style = sound.style;
          var string = ['E', 'A', 'D', 'G'][sound.string];

          if (sound.prev) {
            var rootSound = sound;
            while (rootSound.prev) {
              rootSound = rootSound.prev.ref;
            }
            var rootStyle = rootSound.style;
            var code = string + sound.note.fret;

            if (style === 'hammer' || style === 'pull') {
              var meta = _this.bassSounds.metadata[rootStyle];
              if (meta) {
                if (angular.isUndefined(sound.meta)) {
                  Object.defineProperty(sound, 'meta', {value: 'static', writable: true});
                }
                sound.meta = {offset: meta.pull_offset[code] || 0};
              }

              return ['sounds/bass/{0}/{1}'.format(rootStyle, code)];
            } else if (style === 'ring') {
              if (sound.prev.ref.note.type === 'slide' || sound.note.type === 'slide') {
                return ['sounds/bass/slide/{0}/{1}{2}'.format(rootSound.style, string, sound.note.fret+sound.note.slide)];
              }
              return [];
            }
          }

          if (sound.note.type === 'ghost') {
            return ['sounds/bass/{0}/{1}X'.format(style, string)];
          } else if (sound.note.type === 'grace') {
            return ['sounds/bass/{0}/{1}{2}'.format(style, string, sound.note.fret-2)];
          } else if (sound.note.type === 'slide' && sound.next) {
            return [
              'sounds/bass/{0}/{1}{2}'.format(style, string, sound.note.fret),
              'sounds/bass/slide/{0}/{1}{2}'.format(style, string, sound.note.fret+sound.note.slide)
            ];
          }
          return ['sounds/bass/{0}/{1}{2}'.format(style, string, sound.note.fret)];
        }
      };
      // fetch sounds metadata
      Object.keys(this.bassSounds.meta).forEach(function(style) {
        var url = soundsUrl+_this.bassSounds.meta[style];
        $http.get(url).then(function(response) {
          _this.bassSounds.metadata[style] = response.data;
        });
      }.bind(this));
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


    function createSound(audioData) {
      var source = context.createBufferSource();
      var gain = context.createGain();
      source.connect(gain);
      gain.connect(this.bass.audio);
      source.buffer = audioData;

      return {
        source: source,
        gain: gain,
      }
    }

    AudioPlayer.prototype._playBassSound = function(sound, timeSignature, startTime, beatTime) {
      var note = sound.note;
      // console.log(note.style+' '+note.name);

      if (sound.style === 'ring') {
        return;
      }
      var resources = this.bassSounds.getResources(sound);
      var audioData = resources? this.bufferLoader.loadResource(resources[0]) : null;
      //console.log(this.bufferLoader.loadedResources);
      if (audioData) {
        var source = context.createBufferSource();
        var gain = context.createGain();
        source.connect(gain);
        gain.connect(this.bass.audio);
        source.buffer = audioData;

        var duration;
        if (note.type === 'ghost') {
          duration = 0.25;
        } else {
          duration = sound.noteLength.beatLength*(timeSignature.bottom)*beatTime;
          if (sound.noteLength.staccato) {
            duration = 0.95*duration-(beatTime/4)*0.2;
          }
        }

        var endTime = startTime+duration;
        gain.gain.setValueAtTime(sound.volume, startTime);
        if (sound.next) {
          if (sound.next.ref.style === 'ring') {
            duration = 10;
            var nextSound = sound.next.ref;
            while (nextSound) {
              gain.gain.setValueAtTime(nextSound.volume, endTime);

              var nextSoundDuration = nextSound.noteLength.beatLength*(timeSignature.bottom)*beatTime;
              endTime += nextSoundDuration;

              if (nextSound.note.type === 'slide') {
                var endRate = Math.pow(Math.pow(2, 1/12), nextSound.note.slide || 0);
                source.playbackRate.setValueAtTime(1, endTime-nextSoundDuration);
                source.playbackRate.exponentialRampToValueAtTime(endRate, endTime);
                // break;
                
                var slideResources = this.bassSounds.getResources(nextSound);
                console.log(slideResources);
                var slideEndAudio = this.bufferLoader.loadResource(slideResources[0]);
                if (slideEndAudio) {
                  // finish previous sound and start a new one
                  gain.gain.setValueAtTime(nextSound.volume, endTime-0.02);
                  gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

                  console.log('Secondary slide sound');
                  var source2 = context.createBufferSource();
                  var gain2 = context.createGain();
                  source2.connect(gain2);
                  gain2.connect(this.bass.audio);
                  source2.buffer = slideEndAudio;
                  gain2.gain.setValueAtTime(nextSound.volume/4, endTime-0.025);
                  gain2.gain.exponentialRampToValueAtTime(nextSound.volume, endTime);
                  source2.start(endTime-0.025, 0, 10);

                  gain = gain2;
                  nextSoundDuration = 0;
                } 
              }
              nextSound = nextSound.next? nextSound.next.ref : null;
            }
          } else {
            duration+=0.01;
          }
          gain.gain.setValueAtTime(sound.volume, endTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, endTime+0.01);
        } else {
          if (sound.note.type !== 'slide') {
            gain.gain.setValueAtTime(sound.volume, endTime-0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, endTime+0.01);
            duration += 0.01;
          }
        }

        if (sound.note.type === 'grace') {
          var startRate = Math.pow(Math.pow(2, 1/12), -2);
          source.playbackRate.setValueAtTime(startRate, startTime);
          source.playbackRate.setValueAtTime(1, startTime+0.075);
        } else if (sound.note.type === 'slide') {
          var endRate = Math.pow(Math.pow(2, 1/12), note.slide || 0);
          // source.playbackRate.setValueAtTime(1, startTime);
          // source.playbackRate.setValueAtTime(1, startTime+duration/6);
          // source.playbackRate.exponentialRampToValueAtTime(endRate, endTime);

          var curve = new Float32Array([1, 1, 1+(endRate-1)*0.8, endRate]);
          // var curve = new Float32Array([1, 1+(endRate-1)*0.5, endRate, endRate]);
          source.playbackRate.setValueCurveAtTime(curve, startTime, duration);
          duration = 10;

          gain.gain.setValueAtTime(sound.volume, endTime-0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, endTime);
        }

        if (sound.meta) {
          source.start(startTime, sound.meta.offset || 0, duration);
        } else {
          source.start(startTime, 0, duration);
        }

        var playingSound = {
          source: source,
          gain: gain,
          startTime: startTime,
          endTime: startTime+duration
        };

        this.scheduledSounds.push(playingSound);
        return playingSound;
      }
    };

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
          this._playBassSound(subbeatSound.sound, timeSignature, startAt, noteBeatTime);
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
        var isLastBar = isLastBeatInBar && bar === this.composition.length;
        var nextBar = isLastBar? 1 : isLastBeatInBar? bar+1 : bar;
        var nextBeat = isLastBeatInBar? 1 : beat+1;
        var nextBeatStart = startTime+beatTime;

        // setup next beat's sounds ahead some time
        var schedule = 1000*(nextBeatStart - currentTime - 0.15);
        schedule = Math.max(schedule, 15);
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
      this.playBeat(1, 1, context.currentTime);
    };

    AudioPlayer.prototype.setBpm = function(bpm) {
      this.bpm = bpm;
      this.beatTime = 60/bpm;
    }

    AudioPlayer.prototype.fetchSoundResources = function(sound) {
      if (sound.style && sound.note) {
        var resources = this.bassSounds.getResources(sound);
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
      section.forEachBassSubbeat(function(subbeat) {
        var string;
        for (string = 0; string < 4; string++) {
          var bassSound = subbeat.data[string].sound;
          if (bassSound.note && bassSound.style) {
            var subbeatResources = player.bassSounds.getResources(bassSound);
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
          sound.gain.gain.cancelScheduledValues(currentTime);
          sound.gain.gain.setValueAtTime(sound.gain.gain.value, currentTime);
          sound.gain.gain.linearRampToValueAtTime(0.0001, currentTime+0.05);
        }
      });
      this.oscillator.stop();
      this.oscillator.disconnect();
      this.oscillator.output.disconnect();
      this.dispatchEvent('playbackStopped');
    };

    AudioPlayer.prototype.playBassSample = function(bassSound) {
      var resources = this.bassSounds.getResources(bassSound);
      var player = this;
      if (player.playingBassSample && player.playingBassSample.source.playing) {
        var currentTime = context.currentTime;
        player.playingBassSample.gain.gain.cancelScheduledValues(currentTime);
        player.playingBassSample.gain.gain.setValueAtTime(player.playingBassSample.gain.gain.value, currentTime);
        player.playingBassSample.gain.gain.linearRampToValueAtTime(0.0001, currentTime+0.05);
      }
      function afterLoad(audioBuffer) {
        setTimeout(function() {
          player.playingBassSample = player._playBassSound(
            bassSound,
            { top: 4, bottom: 4 },
            context.currentTime,
            60/player.bpm
          );
          player.playingBassSample.source.playing = true;
          player.playingBassSample.source.addEventListener('ended', function(evt) {
            evt.target.playing = false;
          });
        }, 50);
      }
      this.bufferLoader.loadResource(resources[0], afterLoad);
    };

    AudioPlayer.prototype.playDrumSample = function(drumSound) {
      this._playDrumsSound(drumSound, context.currentTime);
    };

    return new AudioPlayer();
  }
})();