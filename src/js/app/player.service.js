(function() {
  'use strict';

  angular
    .module('bd.app')
    .factory('audioPlayer', audioPlayer);


  function ResourceNotAvailable(resource) {
    this.resource = resource;
  }

  function audioPlayer($timeout, $http, $q,
        context, soundsUrl, Observable, AudioComposer, projectManager, Notes) { //Midi

    // Midi();
    // var notes = new Notes('A0', 'C7');
    // function playMidi(track, sound, startTime, duration) {
    //   var n = notes.map[sound.note.code];
    //   var code = n.label[n.label.length-1].replace('♭', 'b')+(sound.note.octave);
    //   // console.log(code)
    //   var key = MIDI.keyToNote[code];
    //   if (key) {
    //     var start = startTime-context.currentTime;
    //     MIDI.noteOn(0, key, 127, start);
    //     MIDI.noteOff(0, key, start+duration);
    //   }
    // }

    function noteDuration(sound, beatTime, timeSignature) {
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
    }

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
            var duration = noteDuration(sound, beatTime, timeSignature);
            audio.duration += duration;
            audio.endTime += duration;

            audio.gain.setValueAtTime(audio.sound.volume, audio.startTime);
            stack.push(audio);
            */

            // var prevAudio = stack.pop();
            var prevAudio = stack[stack.length-1];
            var audio = _this.createSoundAudio(track, sound, startTime);
            var duration = noteDuration(sound, beatTime, timeSignature);
            audio.duration = duration;
            audio.endTime = startTime + duration;
            _this.composer.join(prevAudio, audio);
            audio.meta = {
              type: 'single',
              string: sound.string,
              note: sound.note,
              startTime: startTime,
              duration: duration
            };
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
            var duration = noteDuration(sound, beatTime, timeSignature);
            var steps = Math.abs(sound.note.fret-sound.note.slide.endNote.fret);
            var curve = new Array(steps+2);
            curve[0] = Math.max(duration*slideStartOffset, 0.02);
            curve[curve.length-1] = Math.max(duration*slideEndOffset, 0.02);
            var slideDuration = duration-curve[0]-curve[curve.length-1];

            if (sound.note.slide.easing) {
              var e = sound.note.slide.easing;
              // e = [0.645, 0.000, 0.900, 0.420]
              var easing = new BezierEasing(e[0], e[1], e[2], e[3]);
              for (var i = 1; i <= steps; i++) {
                var x = easing(i/steps) - easing((i -1)/steps);
                curve[i] = x * slideDuration;
              }
            } else {
              var stepDuration = slideDuration / steps;
              curve.fill(stepDuration, 1, 1+steps);
            }
            return curve;
          },
          metaNotes: function(sound, startTime, curve) {
            var notes = [];
            notes.push({
              note: sound.note,
              startTime: startTime,
              duration: curve[0]
            });
            var direction = sound.note.slide.endNote.fret > sound.note.fret? 1 : -1;
            for (var i = 1; i < curve.length-2; i++) {
              var prevNote = notes[notes.length-1];
              notes.push({
                note: {fret: sound.note.fret + i*direction},
                startTime: prevNote.startTime + prevNote.duration,
                duration: curve[i]
              });
            }
            notes.push({
              note: sound.note.slide.endNote,
              startTime: notes[notes.length-1].startTime + notes[notes.length-1].duration,
              duration: curve[curve.length-1]
            });
            return notes;
          },
          prepareForPlayback: function(track, sound, startTime, beatTime, timeSignature) {
            var s = sound.note.slide.start || 0.2;
            var e = sound.note.slide.end || 0.8;
            var curve = this.slideCurve(sound, beatTime, timeSignature, s, 1-e);
            // console.log(curve)
            var audioStack = _this.composer.createSlide(track, null, sound, curve, startTime, beatTime, timeSignature);

            // sound metadata
            audioStack[0].meta = {
              type: 'sequence',
              string: sound.string,
              notes: this.metaNotes(sound, startTime, curve)
            };
            // playMidi(track, sound, startTime, audioStack[audioStack.length-1].endTime-startTime);
            return audioStack;
          },
          transitionPlayback: function(stack, track, sound, startTime, beatTime, timeSignature) {
            var prevAudio = stack.pop();
            var s = sound.note.slide.start || 0.05;
            var e = sound.note.slide.end || 0.85;
            var curve = this.slideCurve(sound, beatTime, timeSignature, s, 1-e);
            // console.log(curve)
            var audioSounds = _this.composer.createSlide(track, prevAudio, sound, curve, startTime, beatTime, timeSignature);

            // sound metadata
            var lastMetaAudio = prevAudio.meta? prevAudio : stack[0];
            var notes = this.metaNotes(sound, startTime, curve);
            if (lastMetaAudio.meta.notes) {
              Array.prototype.push.apply(lastMetaAudio.meta.notes, notes);
            } else {
              // convert to sequence
              notes.splice(0, 0, {
                note: lastMetaAudio.meta.note,
                startTime: lastMetaAudio.meta.startTime,
                duration: lastMetaAudio.meta.duration
              });
              lastMetaAudio.meta = {
                type: 'sequence',
                string: sound.string,
                notes: notes
              };
            }
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
            var duration = noteDuration(sound, beatTime, timeSignature);
            prevAudio.duration += duration;
            prevAudio.endTime += duration;
            if (sound.note.type === 'bend') {
              _this.composer.bend(prevAudio, sound, duration, startTime, beatTime, timeSignature);
            }
            if (prevAudio.meta) {
              prevAudio.meta.duration += duration;
            } else {
              for (var i = stack.length - 1; i >= 0; i--) {
                var prevMeta = stack[i].meta;
                if (prevMeta && prevMeta.notes) {
                  console.log('found prev meta at: '+i);
                  prevMeta.notes[prevMeta.notes.length-1].duration += duration;
                  break;
                }
              }
              // console.log(stack)
              // stack[0].meta.notes[stack[0].meta.notes.length-1].duration += duration;
            }
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
            var duration = noteDuration(sound, beatTime, timeSignature);

            var startRate = Math.pow(Math.pow(2, 1/12), -2);
            audio.source.playbackRate.setValueAtTime(startRate, startTime);
            audio.source.playbackRate.setValueAtTime(1, startTime+0.075);

            audio.duration = duration;
            audio.endTime = startTime+duration;

            // sound metadata
            audio.meta = {
              type: 'sequence',
              string: sound.string,
              notes: [
                {
                  note: { fret: sound.note.fret - 2 },
                  startTime: startTime,
                  duration: 0.075
                }, {
                  note: sound.note,
                  startTime: startTime + 0.075,
                  duration: duration - 0.075
                }
              ]
            };
            return [audio];
          }
        },
        {
          accepts: function(sound) {
            return sound.note.type === 'bend';
          },
          getResources: function(sound) {
            return ['sounds/bass/{0}/{1}{2}'.format(sound.style, sound.string, sound.note.fret)];
          },
          prepareForPlayback: function(track, sound, startTime, beatTime, timeSignature) {
            var audio = _this.createSoundAudio(track, sound, startTime);
            var duration = noteDuration(sound, beatTime, timeSignature);
            audio.duration = duration;
            audio.endTime = startTime + duration;
            _this.composer.bend(audio, sound, duration, startTime, beatTime, timeSignature);
            audio.meta = {
              type: 'single',
              string: sound.string,
              note: sound.note,
              startTime: startTime,
              duration: duration
            };
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
            audio.meta = {
              type: 'ghost',
              string: sound.string,
              startTime: startTime,
              duration: audio.source.buffer.duration
            };
            return [audio];
          }
        },
        {
          accepts: function(sound) {
            return sound.note.type === 'harmonics';
          },
          getResources: function(sound) {
            return ['sounds/bass/{0}/{1}{2}_H'.format(sound.style, sound.string, sound.note.fret)];
          },
          prepareForPlayback: function(track, sound, startTime, beatTime, timeSignature) {
            var audio = _this.createSoundAudio(track, sound, startTime);
            var duration = noteDuration(sound, beatTime, timeSignature);
            audio.duration = duration;
            audio.endTime = startTime + duration;
            audio.meta = {
              type: 'single',
              string: sound.string,
              note: sound.note,
              startTime: startTime,
              duration: duration
            };
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
            var duration = noteDuration(sound, beatTime, timeSignature);
            audio.duration = duration;
            audio.endTime = startTime+duration;
            audio.meta = {
              type: 'single',
              string: sound.string,
              note: sound.note,
              startTime: startTime,
              duration: duration
            };
            // playMidi(track, sound, startTime, audio.duration);
            return [audio];
          }
        }
      ];
      this.composer = new AudioComposer(context, this);
      var piano = {
        notes: new Notes('A0', 'C7'),
        createSoundAudio: function(track, sound, startTime, resource) {
          // console.log('createSoundAudio: '+resource)
          var audioData = _this.bufferLoader.loadResource(resource);
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
            throw new ResourceNotAvailable(resource);
          }
        },
        handlers:[
          {
            accepts: function(sound) {
              return angular.isDefined(sound.note);
            },
            getResources: function(sound) {
              var code = sound.note.name+sound.note.octave;
              var n = piano.notes.map[code];
              var code = n.label[n.label.length-1].replace('♭', 'b')+(sound.note.octave);
              // console.log(code)
              // return ['sounds/piano/'+code];
              return ['sounds/GrandPianoV3/'+code];
            },
            prepareForPlayback: function(trackId, track, sound, startTime, beatTime) {
              // console.log('piano')
              var resources = this.getResources(sound);
              var audio = piano.createSoundAudio(track, sound, startTime, resources[0]);
              // console.log(audio)
              var duration = (sound.end - sound.start) * beatTime;
              audio.duration = duration;
              audio.endTime = startTime+duration;
              // playMidi(track, sound, startTime, audio.duration);return [];
              return [audio];
            }
          }
        ],
        getHandler: function(sound) {
          for (var i = 0; i < this.handlers.length; i++) {
            var handler = this.handlers[i];
            if (handler.accepts(sound)) {
              return handler;
            }
          }
        }
      };
      this.piano = piano;
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
        // console.log(source.buffer.duration);
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


    AudioPlayer.prototype._getSoundHandler = function(sound) {
      for (var i = 0; i < this.soundHandlers.length; i++) {
        var handler = this.soundHandlers[i];
        if (handler.accepts(sound)) {
          return handler;
        }
      }
    };

    AudioPlayer.prototype._bassSoundScheduled = function(trackId, sound) {};

    AudioPlayer.prototype._playSound = function(trackId, track, beat, sound, startTime, beatTime) {
      var duration = (sound.end-sound.start) * beatTime;
      var audio;
      if (sound.prev) {
        audio = this.piano.playingSounds[sound.string];
      }
      if (!sound.prev || !audio) {
        audio = this.piano.getHandler(sound).prepareForPlayback(trackId, track, sound, startTime, beatTime)[0];
        if (!audio) {
          return;
        }
        audio.gain.setValueAtTime(audio.sound.volume*0.8, startTime);
        if (sound.next) {
          audio.source.start(audio.startTime, audio.offset);
        } else {
          audio.source.start(audio.startTime, audio.offset, duration+0.25);
        }
        this.piano.playingSounds[sound.string] = audio;
      }
      audio.endTime = startTime + duration;
      if (!sound.next) {
        audio.gain.setValueAtTime(audio.sound.volume*0.8, audio.endTime-0.05);
        audio.gain.linearRampToValueAtTime(0.0001, audio.endTime+0.2);
      }
    }

    AudioPlayer.prototype._playBassSound = function(trackId, track, sound, startTime, beatTime, timeSignature) {
      if (sound.prev) {
        return;
      }
      var stack = this._getSoundHandler(sound).prepareForPlayback(track, sound, startTime, beatTime, timeSignature);

      var audio = stack[0];
      audio.gain.setValueAtTime(audio.sound.volume, startTime);

      if (sound.next) {
        var nextSound = sound.next.ref;
        while (nextSound) {
          var start = stack[stack.length-1].endTime;
          // audio.endTime
          this._getSoundHandler(nextSound).transitionPlayback(stack, track, nextSound, start, beatTime, timeSignature);
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
        if (a.meta) {
          this._bassSoundScheduled(trackId, a.meta);
        }
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
                this._playBassSound(trackId, track, subbeatSound.sound, startAt, noteBeatTime, timeSignature);
              } else if (track.type === 'drums') {
                this._playDrumSound(track, subbeatSound, startAt);
              } else {
                startAt = startTime + (subbeatSound.start * beatTime);
                this._playSound(trackId, track, trackBeat, subbeatSound, startAt, noteBeatTime);
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
          section: this.section,
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
      this.piano.playingSounds = {};
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
      function addResources(list) {
        list.forEach(function(resource) {
          if (resources.indexOf(resource) === -1) {
            resources.push(resource);
          }
        });
      }
      sections.forEach(function(section) {
        for (var trackId in section.tracks) {
          var track = section.tracks[trackId];
          if (track.type === 'bass') {
            track.forEachSound(function(bassSound) {
              if (bassSound.note && bassSound.style) {
                addResources(this._getSoundHandler(bassSound).getResources(bassSound));
              }
            }, this);
          }
          if (track.type === 'piano') {
            track.data.forEach(function(beat) {
              beat.data.forEach(function(sound) {
                addResources(this.piano.getHandler(sound).getResources(sound));
              }, this)
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

    AudioPlayer.prototype.play = function(section, beatPrepared, playbackStopped, countdown) {
      console.log('PLAY');
      this.section = section;
      this.playing = true;
      this.lastSyncTimerId = 0;

      var player = this;
      this.beatPreparedCallback = angular.isFunction(beatPrepared)? beatPrepared : angular.noop;
      this.playbackStoppedCallback = angular.isFunction(playbackStopped)? playbackStopped : angular.noop;

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
        try {
          if (currentTime < sound.startTime) {
            sound.source.stop();
          } else {
            sound.gain.cancelScheduledValues(currentTime);
            sound.gain.setValueAtTime(sound.gain.value, currentTime);
            sound.gain.linearRampToValueAtTime(0.0001, currentTime+0.05);
          }
        } catch (ex) {
          console.log('Error');
        }
      });

      /*
      this.oscillator.stop();
      this.oscillator.disconnect();
      this.oscillator.output.disconnect();
      */
      // this.dispatchEvent('playbackStopped');
      this.playbackStoppedCallback();
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
            null,
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