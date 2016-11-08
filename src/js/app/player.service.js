(function() {
  'use strict';

  angular
    .module('bd.app')
    .factory('audioPlayer', audioPlayer);


  function ResourceNotAvailable(resource) {
    this.resource = resource;
  }

  function audioPlayer($timeout, $http, $q, context, soundsUrl, Observable, AudioComposer, projectManager) {

    function AudioPlayer() {
      Observable.call(this, ["playbackStarted", "playbackStopped"]);
      this.playing = false;
      this.countdown = false;
      this.setBpm(60);
      this.setPlaybackSpeed(1);
      this.bufferLoader = new BufferLoader(context, soundsUrl);
      this.scheduledSounds = [];

      this.input = {
        muted: true,
        audio: context.createGain()
      };
      // this.drums.audio.gain.value = 0.65;
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
            return ['sounds/bass/{0}/{1}{2}'.format(rootSound.style, sound.string, sound.note.fret)];
          },
          transitionPlayback: function(stack, track, sound, startTime, beatTime, timeSignature) {
            /*
            var prevAudio = stack.pop();
            var audio = _this.createSoundAudio(track, sound, startTime);
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
            var audio = _this.createSoundAudio(track, sound, startTime);
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
              resources.push('sounds/bass/{0}/{1}{2}'.format(rootSound.style, sound.string, i));
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
          prepareForPlayback: function(track, sound, startTime, beatTime, timeSignature) {
            var curve = this.slideCurve(sound, beatTime, timeSignature, 0.2, 0.2);
            var audioStack = _this.composer.createSlide(track, null, sound, curve, startTime, beatTime, timeSignature);
            return audioStack;
          },
          transitionPlayback: function(stack, track, sound, startTime, beatTime, timeSignature) {
            var prevAudio = stack.pop();
            var curve = this.slideCurve(sound, beatTime, timeSignature, 0.05, 0.15);
            var audioSounds = _this.composer.createSlide(track, prevAudio, sound, curve, startTime, beatTime, timeSignature);
            Array.prototype.push.apply(stack, audioSounds);
          }
        }, {
          accepts: function(sound) {
            return sound.style === 'ring';
          },
          getResources: function(sound) {
            return [];
          },
          prepareForPlayback: function() {
            // error
          },
          transitionPlayback: function(stack, track, sound, startTime, beatTime, timeSignature) {
            var prevAudio = stack[stack.length-1];
            // console.log(prevAudio.endTime+' vs '+startTime);
            var duration = _this.noteDuration(sound, beatTime, timeSignature);
            prevAudio.duration += duration;
            prevAudio.endTime += duration;
          }
        },
        {
          accepts: function(sound) {
            return sound.note.type === 'grace';
          },
          getResources: function(sound) {
            return ['sounds/bass/{0}/{1}{2}'.format(sound.style, sound.string, sound.note.fret-2)];
          },
          prepareForPlayback: function(track, sound, startTime, beatTime, timeSignature) {
            var audio = _this.createSoundAudio(track, sound, startTime);
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
            return sound.note.type === 'bended';
          },
          getResources: function(sound) {
            return ['sounds/bass/{0}/{1}{2}'.format(sound.style, sound.string, sound.note.fret)];
          },
          prepareForPlayback: function(track, sound, startTime, beatTime, timeSignature) {
            var audio = _this.createSoundAudio(track, sound, startTime);
            var duration = _this.noteDuration(sound, beatTime, timeSignature);

            var durationOffset = 0;
            function bendSound(sRate, sTime, eRate, eTime) {
              audio.source.playbackRate.setValueAtTime(sRate, startTime+sTime*duration);
              audio.source.playbackRate.linearRampToValueAtTime(eRate, startTime+eTime*duration);
              var avgRate = (sRate + eRate) / 2;
              var bendDuration = (eTime - sTime) * duration;
              var offset = (avgRate - 1) * bendDuration;
              // console.log('{0} -> {1} ({2} to {3}) : {4}'.format(sRate, eRate, sTime, eTime, offset));
              // console.log('avg rage: {0} duration: {1}'.format(avgRate, bendDuration));
              durationOffset += offset;
            }

            /*
            var bends = [
              {
                bend: 1,
                t: [
                  0.25,  // start time
                  0.50,  // bend time
                  0.52,  // hold time
                  0.65,  // release time
                ]
              }, {
                bend: 3,
                t: [
                  0.75,
                  0.85,
                  0.90,
                  0.99,
                ]
              }
            ];

            for (var i = 0; i < bends.length; i++) {
              var bend = bends[i];
              var bendedRate = Math.pow(Math.pow(2, 1/12), bend.bend);
              bendSound(1, bend.t[0], bendedRate, bend.t[1]);
              bendSound(bendedRate, bend.t[2], 1, bend.t[3]);
              var offset = (bendedRate - 1) * (bend.t[2] - bend.t[1]) * duration;
              durationOffset += offset;
              // console.log(offset)
            }
            */
            console.log(sound.note.bend)
            // var config = sound.note.bend || '';
            // var parts = config.split(',').map(function(v) {return parseFloat(v)});
            var parts = sound.note.bend.map(function(v) {return v*2});
            for (var i = 1; i < parts.length; i++) {
              var prevBend = parts[i-1];
              var bend = parts[i];
              if (bend !== prevBend) {
                bendSound(
                  Math.pow(Math.pow(2, 1/12), prevBend),
                  (i - 1) / (parts.length - 1),
                  Math.pow(Math.pow(2, 1/12), bend),
                  i / (parts.length - 1)
                );
              } else {
                var offset = (Math.pow(Math.pow(2, 1/12), bend) - 1) * (1/(parts.length-1)) * duration;
                // console.log('no bending: '+offset);
                durationOffset += offset;
              }
            }
            // console.log('durationOffset: '+durationOffset);
            audio.duration = duration + durationOffset;
            audio.endTime = startTime + duration;
            return [audio];
          }
        },
        {
          accepts: function(sound) {
            return sound.note.type === 'ghost';
          },
          getResources: function(sound) {
            return ['sounds/bass/{0}/{1}X'.format(sound.style, sound.string)];
          },
          prepareForPlayback: function(track, sound, startTime, beatTime, timeSignature) {
            var audio = _this.createSoundAudio(track, sound, startTime);
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
            return ['sounds/bass/{0}/{1}{2}'.format(sound.style, sound.string, sound.note.fret)];
          },
          prepareForPlayback: function(track, sound, startTime, beatTime, timeSignature) {
            var audio = _this.createSoundAudio(track, sound, startTime);
            var duration = _this.noteDuration(sound, beatTime, timeSignature);
            audio.duration = duration;
            audio.endTime = startTime+duration;
            return [audio];
          }
        }
      ];
      this.composer = new AudioComposer(context, this);
    }

    AudioPlayer.prototype = Object.create(Observable.prototype);

    AudioPlayer.prototype._playDrumStick = function(sound) {
      var audioData = this.bufferLoader.loadResource('sounds/drums/drumstick');
      var source = context.createBufferSource();
      source.buffer = audioData;
      source.connect(context.destination);
      source.start(context.currentTime, 0, 0.2);
    };

    AudioPlayer.prototype._playDrumSound = function(track, sound, startTime) {
      var audioData = this.bufferLoader.loadResource(track.instrument.drumMap[sound.drum].filename);
      if (audioData) {
        var source = context.createBufferSource();
        source.buffer = audioData;
        var gain = context.createGain();
        gain.gain.value = sound.volume;
        source.connect(gain);
        gain.connect(track.audio);
        // console.log(sound);
        // console.log('startTime: {0} volume: {1} duration: {2}'.format(startTime, sound.volume, sound.duration));
        source.start(startTime);
      }
    };

    AudioPlayer.prototype.createSoundAudio = function(track, sound, startTime, index) {
      var resources = this._getSoundHandler(sound).getResources(sound);
      var audioData = resources? this.bufferLoader.loadResource(resources[index || 0]) : null;

      if (audioData) {

        var source = context.createBufferSource();
        var gain = context.createGain();
        source.connect(gain);
        gain.connect(track.audio);
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
        throw new ResourceNotAvailable(resources[index || 0]);
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

    AudioPlayer.prototype._playBassSound = function(track, sound, startTime, beatTime, timeSignature) {
      if (sound.prev) {
        return;
      }
      var stack = this._getSoundHandler(sound).prepareForPlayback(track, sound, startTime, beatTime, timeSignature);

      var audio = stack[0];
      audio.gain.setValueAtTime(audio.sound.volume, startTime);

      if (sound.next) {
        var nextSound = sound.next.ref;
        while (nextSound) {
          this._getSoundHandler(nextSound).transitionPlayback(stack, track, nextSound, audio.endTime, beatTime, timeSignature);
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

    AudioPlayer.prototype.playBeat = function(bar, beat, startTime, initializationBeat) {
      if (!this.playing) return;
      // console.log('player: bar: {0} beat: {1}'.format(bar, beat));

      var playbackStart = bar === this.playbackRange.start.bar && beat === this.playbackRange.start.beat;
      var isPlaybackEnd = playbackStart && !initializationBeat;
      var timeSignature = this.section.timeSignature;
      var currentTime = context.currentTime;
      var beatTime = 60/(this.bpm * this.playbackSpeed);

      if (!isPlaybackEnd) {
        // console.log('Play beat: '+beat);
        for (var trackId in this.section.tracks) {
          var track = this.section.tracks[trackId];

          var trackBeat = track.beat(bar, beat);
          var noteBeatTime = trackBeat.subdivision === 3? beatTime*(2/3) : beatTime;
          track.beatSounds(trackBeat).forEach(function(subbeatSound) {
            var startAt = startTime + (beatTime / trackBeat.subdivision * (subbeatSound.subbeat - 1));
            try {
              if (track.type === 'bass') {
                this._playBassSound(track, subbeatSound.sound, startAt, noteBeatTime, timeSignature);
              } else {
                this._playDrumSound(track, subbeatSound, startAt);
              }
            } catch (ex) {
              if (ex instanceof ResourceNotAvailable) {
                console.log('Failed to load resource: '+ex.resource);
              } else {
                throw ex;
              }
            }
          }, this);
        }
        var flatIndex = (bar-1)*this.section.timeSignature.top+beat-1;
        this.beatPreparedCallback({
          bar: bar,
          beat: beat,
          eventTime: currentTime,
          startTime: startTime,
          endTime: startTime+beatTime,
          duration: beatTime,
          timeSignature: this.section.timeSignature,
          flatIndex: flatIndex,
          playbackActive: !isPlaybackEnd,
          playbackStart: playbackStart
        });
      }

      if (this.scheduledSounds.length) {
        this.scheduledSounds = this.scheduledSounds.filter(function(playingNote) {
          return currentTime <= playingNote.endTime;
        });
      }

      if (isPlaybackEnd) {
        $timeout(function() {
          this.stop();
        }.bind(this), 1000*(startTime - currentTime));
      } else {
        var nextBar, nextBeat;
        var isLastBeatInBar = beat === timeSignature.top;
        var isPlaybackEnd = bar === this.playbackRange.end.bar && beat === this.playbackRange.end.beat;
        if (isPlaybackEnd) {
          nextBar = this.playbackRange.start.bar;
          nextBeat = this.playbackRange.start.beat;
        } else {
          nextBar = isLastBeatInBar? bar+1 : bar;
          nextBeat = isLastBeatInBar? 1 : beat+1;
        }

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
      var gain = context.createGain();
      gain.gain.value = 0.0001;
      // gain.gain.value = 0.33;

      // TODO: move to visualizer
      /*
      var oscillator = context.createOscillator();
      oscillator.frequency.value = 40;
      oscillator.output = gain;
      oscillator.connect(gain);
      oscillator.output.connect(this.bass.audio);
      this.oscillator = oscillator;

      oscillator.start();
      */
      var bar = this.playbackRange.start.bar;
      var beat = this.playbackRange.start.beat;
      this.playBeat(bar, beat, context.currentTime, true);
    };

    AudioPlayer.prototype.setBpm = function(bpm) {
      this.bpm = bpm;
    }

    AudioPlayer.prototype.setPlaybackSpeed = function(playbackSpeed) {
      this.playbackSpeed = playbackSpeed;
    };

    AudioPlayer.prototype.fetchSoundResources = function(sound) {
      if (sound.style && sound.note) {
        var resources = this._getSoundHandler(sound).getResources(sound);
        this.bufferLoader.loadResources(resources);
      }
    }

    AudioPlayer.prototype.fetchResources = function(sections, doneCallback) {
      if (!angular.isArray(sections)) {
        sections = [sections];
      }

      var callbackThis = arguments[2];
      var callbackArgs = Array.prototype.slice.call(arguments, 3);
      var task = $q.defer();
      function resourcesFetched() {
        task.resolve();
        if (doneCallback) {
          doneCallback.apply(callbackThis, callbackArgs);
        }
      }

      var resources = [];
      sections.forEach(function(section) {
        for (var trackId in section.tracks) {
          var track = section.tracks[trackId];
          if (track.type === 'bass') {
            track.forEachSound(function(bassSound) {
              if (bassSound.note && bassSound.style) {
                var subbeatResources = this._getSoundHandler(bassSound).getResources(bassSound);
                subbeatResources.forEach(function(resource) {
                  if (resources.indexOf(resource) === -1) {
                    resources.push(resource);
                  }
                });
              }
            }, this);
          }
        }
      }, this);
      console.log(resources);
      if (resources.length) {
        this.bufferLoader.loadResources(resources, resourcesFetched, task.reject);
      } else {
        if (doneCallback) {
          doneCallback.apply(callbackThis, callbackArgs);
        }
        return $q.when();
      }
      return task.promise;
    };

    AudioPlayer.prototype.play = function(section, beatPreparedCallback, countdown) {
      console.log('PLAY');
      this.section = section;
      this.playing = true;
      this.lastSyncTimerId = 0;

      var player = this;
      this.beatPreparedCallback = angular.isFunction(beatPreparedCallback)? beatPreparedCallback : angular.noop;

      var count = countdown? 3 : 0;
      function countDownTick() {
        if (count > 0) {
          count--;
          if (player.playing) {
            player._playDrumStick();
            setTimeout(countDownTick, 60000/(player.bpm * player.playbackSpeed));
          }
        } else {
          player._play();
        }
      }
      countDownTick();
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
          sound.gain.setValueAtTime(sound.gain.value, currentTime);
          sound.gain.linearRampToValueAtTime(0.0001, currentTime+0.05);
        }
      });
      /*
      this.oscillator.stop();
      this.oscillator.disconnect();
      this.oscillator.output.disconnect();
      */
      this.dispatchEvent('playbackStopped');
    };

    AudioPlayer.prototype.playBassSample = function(track, bassSound) {
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
            track,
            bassSound,
            context.currentTime,
            60 / (player.bpm * player.playbackSpeed),
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

    AudioPlayer.prototype.playDrumSample = function(track, drumSound) {
      this._playDrumSound(track, drumSound, context.currentTime);
    };

    return new AudioPlayer();
  }
})();