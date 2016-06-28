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
      this.input.audio.gain.value = 0.001;
      this.bufferLoader.loadResource('sounds/drums/drumstick');

      var _this = this;
      this.bassSounds = {
        finger: {
          getResources: function(sound) {
            var string = ['E', 'A', 'D', 'G'][sound.string];
            if (sound.note.type === 'ghost') {
              return ['sounds/bass/finger/{0}X'.format(string)];
            } else if (sound.note.type === 'grace') {
              return [
                'sounds/bass/finger/{0}{1}'.format(string, sound.note.fret-2),
                'sounds/bass/finger/{0}{1}'.format(string, sound.note.fret)
              ];
            }
            return ['sounds/bass/finger/{0}{1}'.format(string, sound.note.fret)];
          }
        },
        slap: {
          metadata: 'sounds/bass/slap/metadata.json',
          getResources: function(sound) {
            var string = ['E', 'A', 'D', 'G'][sound.string];
            if (sound.note.type === 'ghost') {
              return ['sounds/bass/slap/{0}X'.format(string)];
            }
            return ['sounds/bass/slap/{0}{1}'.format(string, sound.note.fret)];
          }
        },
        pop: {
          metadata: 'sounds/bass/pop/metadata.json',
          getResources: function(sound) {
            var string = ['E', 'A', 'D', 'G'][sound.string];
            if (sound.note.type === 'ghost') {
              return ['sounds/bass/pop/{0}X'.format(string)];
            }
            return ['sounds/bass/pop/{0}{1}'.format(string, sound.note.fret)];
          }
        },
        tap: {
          getResources: function(sound) {
            var string = ['E', 'A', 'D', 'G'][sound.string];
            if (sound.note.type === 'ghost') {
              return ['sounds/bass/tap/{0}X'.format(string)];
            }
            return ['sounds/bass/tap/{0}{1}'.format(string, sound.note.fret)];
          }
        },
        hammer: {
          getResources: function(sound) {
            var rootSound;
            var prevSound = sound.prev;
            while (prevSound) {
              rootSound = _this.composition.bassSubbeat(prevSound.bar, prevSound.beat, prevSound.subbeat)[prevSound.string].sound;
              prevSound = rootSound.prev;
            }

            var style = rootSound.style;
            // style = 'finger';
            var string = ['E', 'A', 'D', 'G'][sound.string];
            var code = string + sound.note.fret;

            var meta = _this.bassSounds[style].metadata;
            if (meta) {
              sound._meta = {offset: meta.pull_offset[code] || 0};
            }

            return ['sounds/bass/{0}/{1}'.format(style, code)];
            // return ['sounds/bass/tap/{0}{1}'.format(string, sound.note.fret)];
          }
        }
      };
      this.bassSounds.pull = this.bassSounds.hammer;
      // fetch sounds metadata
      Object.keys(this.bassSounds).forEach(function(style) {
        var styleObj = this.bassSounds[style];
        if (styleObj.metadata) {
          $http.get(styleObj.metadata).then(function(response) {
            styleObj.metadata = response.data;
          });
        }
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

    AudioPlayer.prototype._playBassSound = function(sound, timeSignature, startTime, beatTime) {
      var note = sound.note;
      // console.log(note.style+' '+note.name);
      var source = context.createBufferSource();
      var gain = context.createGain();

      source.connect(gain);
      gain.connect(this.bass.audio);
      var audioData = this.bufferLoader.loadResource(this.bassSounds[sound.style].getResources(sound)[0]);
      //console.log(this.bufferLoader.loadedResources);
      if (audioData) {
        var duration;
        source.buffer = audioData;
        if (note.type === 'ghost') {
          duration = 0.25;
        } else {
          duration = sound.noteLength.beatLength*(timeSignature.bottom)*beatTime;
          if (sound.noteLength.staccato) {
            duration = 0.92*duration-(beatTime/4)*0.25;
          }
        }

        var endTime = startTime+duration;
        gain.gain.setValueAtTime(sound.volume, startTime);
        if (sound.next) {
          duration+=0.01;
          gain.gain.setValueAtTime(sound.volume, endTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, endTime+0.01);
        } else {
          gain.gain.setValueAtTime(sound.volume, endTime-0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, endTime);
        }

        if (sound.note.type === 'grace') {
          var startRate = Math.pow(Math.pow(2, 1/12), -2);
          source.playbackRate.setValueAtTime(startRate, startTime);
          source.playbackRate.setValueAtTime(1, startTime+0.075);
        } else if (sound.note.type === 'slide') {
          var endRate = Math.pow(Math.pow(2, 1/12), note.slide || 0);
          source.playbackRate.setValueAtTime(1, startTime);
          source.playbackRate.setValueAtTime(1, startTime+duration/6);
          source.playbackRate.linearRampToValueAtTime(endRate, endTime);
          duration = duration*2;
        }

        if (sound._meta) {
          source.start(startTime, sound._meta.offset || 0, duration);
          delete sound._meta;
        } else {
          source.start(startTime, 0, duration);
        }

        // if (sound.note.type === 'grace') {
        //   gain.gain.setValueAtTime(sound.volume, startTime+0.025);
        //   gain.gain.linearRampToValueAtTime(0.001, startTime+0.025+0.02);

        //   var audioData = this.bufferLoader.loadResource(bassSounds[sound.style].getResources(sound)[1]);
        //   var source2 = context.createBufferSource();
        //   var gain2 = context.createGain();
        //   source2.buffer = audioData;
        //   source2.connect(gain2);
        //   gain2.connect(this.bass.audio);
        //   gain2.gain.setValueAtTime(sound.volume, startTime+0.025);
        //   gain2.gain.setValueAtTime(sound.volume, endTime-0.002);
        //   gain2.gain.linearRampToValueAtTime(0.001, endTime);
        //   source2.start(startTime+0.025, 0, endTime);
        // }

        // source.start(startTime, 0, endTime);

        // if (note.type === 'slide') {
        //   endTime = startTime+duration;
        //   source.start(startTime, 0, endTime);
        //   gain.gain.setValueAtTime(sound.volume, endTime-0.05);
        //   gain.gain.linearRampToValueAtTime(0.001, endTime);
        //   var semitoneRatio = Math.pow(2, 1/12);
        //   var endRate = Math.pow(semitoneRatio, note.slide || 0);
        //   source.playbackRate.setValueAtTime(1, startTime);
        //   source.playbackRate.linearRampToValueAtTime(endRate, endTime);
        // } else if (sound.note.type === 'grace') {
        //   var semitoneRatio = Math.pow(2, 1/12);
        //   var startRate = Math.pow(semitoneRatio, -2);
        //   source.playbackRate.setValueAtTime(startRate, startTime);
        //   source.playbackRate.setValueAtTime(1, startTime+0.075);
        //   source.start(startTime, 0, endTime);
        // } else if (sound.style === 'hammer') {
        //   endTime = startTime+duration+0.05;
        //   gain.gain.setValueAtTime(sound.volume, startTime);
        //   source.start(startTime, 0, endTime);

        //   // gain.gain.linearRampToValueAtTime(sound.volume, startTime+0.05);
        //   gain.gain.setValueAtTime(sound.volume, endTime-0.05);
        //   gain.gain.linearRampToValueAtTime(0.001, endTime);
        // } else {
        //   if (sound.next) {
        //     endTime = startTime+duration+0.01;
        //     source.start(startTime, 0, endTime);
        //     gain.gain.setValueAtTime(sound.volume, endTime-0.01);
        //     gain.gain.linearRampToValueAtTime(0.001, endTime);
        //   } else {
        //     endTime = startTime+duration+0.01;
        //     source.start(startTime, 0, endTime);
        //     gain.gain.setValueAtTime(sound.volume, endTime-0.02);
        //     gain.gain.linearRampToValueAtTime(0.0001, endTime);
        //   }
        // }
        var playingSound = {
          note: note,
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
        setTimeout(this.playBeat.bind(this), schedule, nextBar, nextBeat, nextBeatStart);
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
        var resources = this.bassSounds[sound.style].getResources(sound);
        this.bufferLoader.loadResources(resources);
      }
    }

    AudioPlayer.prototype.play = function(section, beatPreparedCallback, repeats) {
      console.log('PLAY');
      this.composition = section;
      this.playing = true;
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
            var subbeatResources = player.bassSounds[bassSound.style].getResources(bassSound);
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
      var resources = this.bassSounds[bassSound.style].getResources(bassSound);
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