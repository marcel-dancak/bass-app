(function() {
  'use strict';

  angular
    .module('bd.app')
    .factory('audioPlayer', audioPlayer);


  function ResourceNotAvailable(resource) {
    this.resource = resource;
  }


  function audioPlayer($q, context, Observable, AudioComposer, Notes) { //Midi
    // Midi();
    // var notes = new Notes('A0', 'C7');
    // function playMidi(track, sound, startTime, duration) {
    //   var code = Notes.toFlat(sound.note.name).replace('♭', 'b')+(sound.note.octave);
    //   console.log(code)
    //   var key = MIDI.keyToNote[code];
    //   if (key) {
    //     var start = startTime-context.currentTime;
    //     MIDI.noteOn(0, key, 90, start);
    //     MIDI.noteOff(0, key, start+duration);
    //   }
    // }

    function buildSamplesCache(baseSamples, notes) {
      function closestSample(note) {
        var noteValue = Notes.noteValue(note);
        var sample;
        var shift = 1000;
        for (var i = 0; i < baseSamples.length; i++) {
          var sampleCode = baseSamples[i];
          var sampleValue = Notes.codeToValue(sampleCode);
          var diff = noteValue - sampleValue;
          if (Math.abs(diff) < Math.abs(shift)) {
            shift = diff;
            sample = sampleCode;
          } else {
            break;
          }
        }
        return {
          code: sample,
          shift: shift
        }
      }
      var samples = {};
      notes.list.forEach(function(n) {
        var note = {
          name: n.label[0],
          octave: n.octave
        };
        var index = Notes.noteValue(note);
        var sample = closestSample(note);
        samples[index] = sample;
      });
      return samples;
    }


    function noteRealDuration(sound, beatTime) {
      var duration = (sound.end-sound.start) * beatTime;
      if (sound.note.staccato) {
        duration = 0.95*duration-(beatTime/4)*0.2;
      }
      return duration-(sound.offset || 0);
    }

    function AudioPlayer() {
      Observable.call(this, ["playbackStarted", "playbackStopped"]);
      this.playing = false;
      this.countdown = false;
      this.setBpm(60);
      this.setPlaybackSpeed(1);
      this.scheduledSounds = [];
      this.context = context;

      Object.defineProperty(this, 'bpm', {
        get: function() {
          return (this.audioTrack && !this.audioTrack.track.muted && this.audioTrack.bpm) || this._bpm;
          // var useTrackBpm = this.audioTrack && !this.audioTrack.track.muted && Boolean(this.audioTrack.bpm);
          // return useTrackBpm? this.audioTrack.bpm : this._bpm;
        }
      });

      this.input = {
        muted: true,
        audio: context.createGain()
      };
      // this.drums.audio.gain.value = 0.65;
      this.input.audio.gain.value = 0.001;

      var _this = this;
      this.soundHandlers = [
        {
          accepts: function(sound) {
            return sound.style === 'hammer' || sound.style === 'pull';
          },
          getResources: function(track, sound) {
            var rootSound = sound;
            while (rootSound.prev) {
              rootSound = track.prevSound(rootSound);
            }
            return ['bass/{0}/{1}{2}'.format(rootSound.style, sound.string, sound.note.fret)];
          },
          transitionPlayback: function(stack, track, sound, startTime, beatTime) {
            /*
            var prevAudio = stack.pop();
            var audio = _this.createSoundAudio(track, sound, startTime, beatTime);
            audio = _this.composer.join(prevAudio, audio);
            audio.gain.setValueAtTime(sound.volume, startTime);
            var duration = noteRealDuration(sound, beatTime);
            audio.duration += duration;
            audio.endTime += duration;

            audio.gain.setValueAtTime(audio.sound.volume, audio.startTime);
            stack.push(audio);
            */

            // var prevAudio = stack.pop();
            var prevAudio = stack[stack.length-1];
            var audio = _this.createSoundAudio(track, sound, startTime, beatTime);
            _this.composer.join(prevAudio, audio);
            audio.meta = {
              type: 'single',
              string: sound.string,
              note: sound.note,
              startTime: startTime,
              duration: audio.duration
            };
            stack.push(audio);
          }
        }, {
          accepts: function(sound) {
            return sound.note.type === 'slide';
          },
          getResources: function(track, sound) {
            var rootSound = sound;
            while (rootSound.prev) {
              rootSound = track.prevSound(rootSound);
            }
            var step = sound.note.fret > sound.endNote.fret? -1 : 1;
            var outOfRange = sound.endNote.fret + step;
            var resources = [];
            for (var i = sound.note.fret; i !== outOfRange; i += step) {
              resources.push('bass/{0}/{1}{2}'.format(rootSound.style, sound.string, i));
            }
            return resources;
          },
          slideCurve: function(sound, beatTime, slideStartOffset, slideEndOffset) {
            var duration = noteRealDuration(sound, beatTime);

            var steps = Math.abs(sound.note.fret-sound.endNote.fret);
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
            var direction = sound.endNote.fret > sound.note.fret? 1 : -1;
            for (var i = 1; i < curve.length-2; i++) {
              var prevNote = notes[notes.length-1];
              notes.push({
                note: {fret: sound.note.fret + i*direction},
                startTime: prevNote.startTime + prevNote.duration,
                duration: curve[i]
              });
            }
            notes.push({
              note: sound.endNote,
              startTime: notes[notes.length-1].startTime + notes[notes.length-1].duration,
              duration: curve[curve.length-1]
            });
            return notes;
          },
          prepareForPlayback: function(track, sound, startTime, beatTime) {
            var s = sound.note.slide.start || 0.2;
            var e = sound.note.slide.end || 0.8;
            var curve = this.slideCurve(sound, beatTime, s, 1-e);
            // console.log(curve)
            var audioStack = _this.composer.createSlide(track, null, sound, curve, startTime, beatTime);

            // sound metadata
            audioStack[0].meta = {
              type: 'sequence',
              string: sound.string,
              notes: this.metaNotes(sound, startTime, curve)
            };
            // playMidi(track, sound, startTime, audioStack[audioStack.length-1].endTime-startTime);
            return audioStack;
          },
          transitionPlayback: function(stack, track, sound, startTime, beatTime) {
            var prevAudio = stack.pop();
            var s = sound.note.slide.start || 0.05;
            var e = sound.note.slide.end || 0.85;
            var curve = this.slideCurve(sound, beatTime, s, 1-e);
            // console.log(curve)
            var audioSounds = _this.composer.createSlide(track, prevAudio, sound, curve, startTime, beatTime);

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
          getResources: function(track, sound) {
            // return [];
            var rootSound = sound;
            while (rootSound.prev) {
              rootSound = track.prevSound(rootSound);
            }
            return ['bass/{0}/{1}{2}'.format(rootSound.style, sound.string, sound.note.fret)];
          },
          prepareForPlayback: function() {
            // error
          },
          transitionPlayback: function(stack, track, sound, startTime, beatTime) {
            var prevAudio = stack[stack.length-1];
            // console.log(prevAudio.endTime+' vs '+startTime);
            var duration = noteRealDuration(sound, beatTime);
            if (prevAudio.duration + duration > prevAudio.source.buffer.duration) {
              var resource = this.getResources(track, sound)[0];
              var ab = _this.bufferLoader.loadResource(resource);
              if (ab) {
                // TODO: some sophisticated duraation lookahead
                ab = _this.composer.letRingSound(sound.note, ab, duration+0.5);
                var audio = _this.createSoundAudio(track, sound, startTime, beatTime, ab);

                // # Version 1
                // var overlay = 0.03;
                // prevAudio.duration += overlay;
                // prevAudio.endTime += overlay;
                // prevAudio.gain.setValueAtTime(prevAudio.sound.volume, startTime);
                // prevAudio.gain.linearRampToValueAtTime(0.00001, startTime+overlay);
                // audio.gain.setValueAtTime(0, startTime);
                // audio.gain.linearRampToValueAtTime(sound.volume, startTime+overlay);
                // return stack.push(audio);

                // # Version 2 - same as hammer-on
                // TODO: add parameter to join to configure skipping time
                _this.composer.join(prevAudio, audio);
                // TODO check if it works
                // audio.meta = {
                //   type: 'single',
                //   string: sound.string,
                //   note: sound.note,
                //   startTime: startTime,
                //   duration: duration
                // };
                stack.push(audio);
              }
            } else {
              prevAudio.duration += duration;
              prevAudio.endTime += duration;
              if (sound.note.type === 'bend') {
                _this.composer.bend(prevAudio, sound, duration, startTime, beatTime);
              }
            }
            if (prevAudio.meta) {
              prevAudio.meta.duration += duration;
            } else {
              for (var i = stack.length - 1; i >= 0; i--) {
                var prevMeta = stack[i].meta;
                if (prevMeta && prevMeta.notes) {
                  // console.log('found prev meta at: '+i);
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
          getResources: function(track, sound) {
            return [
              'bass/{0}/{1}{2}'.format(sound.style, sound.string, sound.note.fret),
              'bass/{0}/{1}{2}'.format(sound.style, sound.string, sound.endNote.fret)
            ];
          },
          prepareForPlayback: function(track, sound, startTime, beatTime) {
            var graceTime = 0.08;
            var startAudio = _this.createSoundAudio(track, sound, startTime, beatTime);
            var endAudio = _this.createSoundAudio(track, sound, startTime + graceTime, beatTime, 1);

            var duration = noteRealDuration(sound, beatTime);
            startAudio.duration = graceTime;
            startAudio.endTime = startTime+startAudio.duration;

            endAudio.duration = duration - startAudio.duration;
            endAudio.endTime = startTime + duration;

            _this.composer.join(startAudio, endAudio);

            // sound metadata
            endAudio.meta = {
              type: 'sequence',
              string: sound.string,
              notes: [
                {
                  note: sound.note,
                  startTime: startTime,
                  duration: graceTime
                }, {
                  note: sound.endNote,
                  startTime: startTime + graceTime,
                  duration: duration - graceTime
                }
              ]
            };
            return [startAudio, endAudio];
          }
        },
        {
          accepts: function(sound) {
            return sound.note.type === 'bend';
          },
          getResources: function(track, sound) {
            return ['bass/{0}/{1}{2}'.format(sound.style, sound.string, sound.note.fret)];
          },
          prepareForPlayback: function(track, sound, startTime, beatTime) {
            var audio = _this.createSoundAudio(track, sound, startTime, beatTime);
            _this.composer.bend(audio, sound, audio.duration, startTime, beatTime);
            audio.meta = {
              type: 'single',
              string: sound.string,
              note: sound.note,
              startTime: startTime,
              duration: audio.duration
            };
            return [audio];
          }
        },
        {
          accepts: function(sound) {
            return sound.note.type === 'ghost';
          },
          getResources: function(track, sound) {
            return ['bass/{0}/{1}X'.format(sound.style, sound.string)];
          },
          prepareForPlayback: function(track, sound, startTime, beatTime) {
            var audio = _this.createSoundAudio(track, sound, startTime, beatTime);
            // TODO: use Math.min in 'createSoundAudio' for all sounds?
            audio.duration = Math.min(audio.duration, audio.source.buffer.duration)-0.02;
            audio.endTime = startTime + audio.duration;
            audio.meta = {
              type: 'ghost',
              string: sound.string,
              startTime: startTime,
              duration: audio.duration
            };
            return [audio];
          }
        },
        {
          accepts: function(sound) {
            return sound.note.type === 'harmonics';
          },
          getResources: function(track, sound) {
            return ['bass/{0}/{1}{2}_H'.format(sound.style, sound.string, sound.note.fret)];
          },
          prepareForPlayback: function(track, sound, startTime, beatTime) {
            var audio = _this.createSoundAudio(track, sound, startTime, beatTime);
            audio.meta = {
              type: 'single',
              string: sound.string,
              note: sound.note,
              startTime: startTime,
              duration: audio.duration
            };
            return [audio];
          }
        },
        {
          accepts: function(sound) {
            return sound.note.type === 'regular';
          },
          getResources: function(track, sound) {
            return ['bass/{0}/{1}{2}'.format(sound.style, sound.string, sound.note.fret)];
          },
          prepareForPlayback: function(track, sound, startTime, beatTime) {
            // var audio;
            // if (sound.next) {
            //   var duration = noteRealDuration(sound, beatTime);
            //   var nextSound = track.nextSound(sound);
            //   while (nextSound && nextSound.style === 'ring') {
            //     duration += noteRealDuration(nextSound, beatTime);
            //     nextSound = nextSound.next? track.nextSound(nextSound) : null;
            //   }
            //   audio = _this.createSoundAudio(track, sound, startTime, beatTime, 0, duration+0.5);
            //   audio.duration = noteRealDuration(sound, beatTime);
            //   audio.endTime = startTime + audio.duration;
            // } else {
            //   audio = _this.createSoundAudio(track, sound, startTime, beatTime);
            // }
            var audio = _this.createSoundAudio(track, sound, startTime, beatTime);
            audio.meta = {
              type: 'single',
              string: sound.string,
              note: sound.note,
              startTime: startTime,
              duration: audio.duration
            };
            return [audio];
          }
        }
      ];
      this.composer = new AudioComposer(context, this);
      var piano = {
        notes: new Notes('A0', 'C7'),
        playingSounds: {},
        handlers:[
          {
            accepts: function(sound) {
              return angular.isDefined(sound.note);
            },
            getResources: function(track, sound) {
              var preset = track.instrument.preset;
              var sample = piano.samples[preset][Notes.noteValue(sound.note)];
              return ['piano/'+preset+'/'+sample.code.replace('♭', 'b')];
            },
            prepareForPlayback: function(trackId, track, sound, startTime, beatTime) {
              var resources = this.getResources(track, sound);

              var sample = piano.samples[track.instrument.preset][Notes.noteValue(sound.note)];
              var rate = (sample.shift !== 0)? Math.pow(Math.pow(2, 1/12), sample.shift) : 1;

              var duration = noteRealDuration(sound, beatTime);
              if (sound.next) {
                var nextSound = track.nextSound(sound);
                while (nextSound) {
                  duration += noteRealDuration(nextSound, beatTime);
                  nextSound = nextSound.next? track.nextSound(nextSound) : null;
                }
                // console.log('Total duration: '+duration);
                duration *= rate;
                // var available = audio.source.buffer.duration * rate;
                // if (available < totalDuration) {
                //   console.log(available+' / '+totalDuration);
                //   audioData = this.composer.enlarge(sound.note, audioData, duration);
                // }
              }
              var opts = {
                duration: duration,
                note: {
                  name: sample.code.substr(0, sample.code.length-1).replace('b', '♭').replace('#', '♯'),
                  octave: parseInt(sample.code.substr(-1))
                }
              };
              var audio = _this.createSoundAudio(track, sound, startTime, beatTime, resources[0], opts);

              // console.log(sample.code+' -> '+sample.shift);
              audio.source.playbackRate.value = rate;
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
      var acousticPianoSamples = buildSamplesCache((
        'C1 E♭1 G♭1 A1 C2 E♭2 G♭2 A2 C3 E♭3 G♭3 A3 '+
        'C4 E♭4 G♭4 A4 C5 E♭5 G♭5 A5 C6 E♭6 G♭6 A6 '+
        'C7 E♭7 G♭7 A7').split(' '), piano.notes
      );
      var electricPianoSamples = buildSamplesCache(
        'F1 B1 E2 A2 D3 G3 B3 D4 F4 B4 E5 A5 D6 G6 C7'.split(' '), // jRhodes3
        piano.notes
      );
      var electricGuitarSamples = buildSamplesCache(
        // Voxline
        // 'E♭2 F2 A♭2 B♭2 D♭3 E♭3 F3 A♭3 A♭3 B♭3 B3 D♭4 F4 G♭4 B♭4 B4 D♭5 F5 G♭5 A♭5 B5 '.split(' '),
        // EleG-Clean
        'E1 G1 C2 E2 G2 C3 E3 G3 C4 E4 G4 C5 E5 G5 C6 E6 G6 C7 E7 G7'.split(' '),
        piano.notes
      );
      // 'C2 G♭2 C3 G♭3 C4 G♭4 C5 G♭5 C6 G♭6 C7'.split(' '), // fm-piano
      piano.samples = {
        acoustic: acousticPianoSamples,
        electric: electricPianoSamples,
        guitar: electricGuitarSamples
      };
      this.piano = piano;
      piano.strings = [
        new Notes('E3', 'E5'),
        new Notes('B2', 'B4'),
        new Notes('G2', 'G4'),
        new Notes('D2', 'D4'),
        new Notes('A1', 'A3'),
        new Notes('E1', 'E3')
      ];
      piano.note = function(string, fret) {
        var stringNotes = this.strings[string];
        var note = stringNotes.list[fret];
        return note.label[0]+note.octave;
      }
      window.p = piano;
    }

    AudioPlayer.prototype = Object.create(Observable.prototype);

    AudioPlayer.prototype._playDrumStick = function(sound) {
      var audioData = this.bufferLoader.loadResource('drums/drumstick');
      var source = context.createBufferSource();
      source.buffer = audioData;
      source.connect(context.destination);
      source.start(context.currentTime, 0, 0.2);
    };

    AudioPlayer.prototype._playDrumSound = function(track, sound, startTime) {
      var audioData = this.bufferLoader.loadResource(track.instrument.drumMap[sound.drum].filename);
      if (audioData) {
        var source = track.audio.context.createBufferSource();
        source.buffer = audioData;
        var gain = track.audio.context.createGain();
        gain.gain.value = sound.volume;
        source.connect(gain);
        gain.connect(track.audio);

        // console.log(source.buffer.duration);
        // console.log('startTime: {0} volume: {1} duration: {2}'.format(startTime, sound.volume, sound.duration));
        source.start(startTime);
        this.scheduledSounds.push({
          // source: source,
          gain: gain.gain,
          // output: gain,
          // startTime: startTime,
          endTime: startTime + source.buffer.duration,
        });
      }
    };


    AudioPlayer.prototype.createSoundAudio = function(track, sound, startTime, beatTime, resource, params) {
      params = params || {};
      var audioData;
      switch (typeof resource) {
        case 'undefined':
          resource = 0;
        case 'number':
          resource = this._getSoundHandler(sound).getResources(track, sound)[resource];
        case 'string':
          audioData = this.bufferLoader.loadResource(resource);
          if (!audioData) {
            throw new ResourceNotAvailable(resource);
          }
          break;
        default:
          audioData = resource;
      }

      var duration = noteRealDuration(sound, beatTime);
      var minDuration = Math.max(duration, params.duration || 0);
      // this.composer.enlarge(sound, audioData, 6);
      if (audioData.duration < minDuration) {
        var note = params.note || sound.note;
        if (note && note.name) {
          audioData = this.composer.enlarge(note, audioData, minDuration);
        }
      }

      var source = track.audio.context.createBufferSource();
      var gain = track.audio.context.createGain();
      source.connect(gain);
      gain.connect(track.audio);
      source.buffer = audioData;
      return {
        sound: sound,
        source: source,
        gain: gain.gain,
        output: gain,
        startTime: startTime,
        endTime: startTime + duration,
        duration: duration,
        offset: 0
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

    AudioPlayer.prototype._playSound = function(trackId, track, sound, startTime, beatTime) {
      startTime += sound.offset || 0;
      var duration = noteRealDuration(sound, beatTime);
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
        this.scheduledSounds.push(audio);
        this.piano.playingSounds[sound.string] = audio;
      }
      // update sound's end time
      audio.endTime = startTime + duration;
      if (!sound.next) {
        audio.gain.setValueAtTime(audio.sound.volume*0.8, audio.endTime-0.05);
        audio.gain.linearRampToValueAtTime(0.0001, audio.endTime+0.2);
      } else {
        audio.gain.setValueAtTime(audio.sound.volume*0.8, audio.endTime);
        // var totalDuration = duration;
        // var nextSound = track.nextSound(sound);
        // while (nextSound) {
        //   totalDuration += noteRealDuration(nextSound, beatTime);
        //   nextSound = nextSound.next? track.nextSound(nextSound) : null;
        // }
        // console.log('Total duration: '+totalDuration);
        // totalDuration *= audio.source.playbackRate.value;
        // var available = audio.source.buffer.duration * audio.source.playbackRate.value;
        // if (available < totalDuration) {
        //   console.log(available+' / '+totalDuration);
        //   audioData = this.composer.enlarge(sound.note, audioData, duration);
        // }
      }
      // if (!sound.prev) {
      //   playMidi(track, sound, startTime, audio.duration);
      // }
    }

    AudioPlayer.prototype._playBassSound = function(trackId, track, sound, startTime, beatTime) {
      if (sound.prev) {
        return;
      }
      startTime += sound.offset || 0;
      var stack = this._getSoundHandler(sound).prepareForPlayback(track, sound, startTime, beatTime);

      var audio = stack[0];
      audio.gain.setValueAtTime(audio.sound.volume, startTime);

      if (sound.next) {
        var nextSound = track.nextSound(sound);
        while (nextSound) {
          var start = stack[stack.length-1].endTime;
          // audio.endTime
          this._getSoundHandler(nextSound).transitionPlayback(stack, track, nextSound, start, beatTime);
          audio = stack[stack.length-1];
          nextSound = nextSound.next? track.nextSound(nextSound) : null;
        }
      }

      audio = stack[stack.length-1];
      var endVolume = audio.slide? audio.slide.volume : audio.sound.volume;
      audio.gain.setValueAtTime(endVolume, audio.endTime-0.016);
      audio.gain.linearRampToValueAtTime(0.000001, audio.endTime);

      for (var i = 0; i < stack.length; i++) {
        var a = stack[i];
        // a little longer duration fixes sound cracking at the end in Firefox
        a.source.start(a.startTime, a.offset, a.duration+0.01);
        this.scheduledSounds.push(a);
        if (a.meta) {
          this._bassSoundScheduled(trackId, a);
        }
      }
      return audio;
    }

    AudioPlayer.prototype.playBeat = function(bar, beat, startTime, initializationBeat) {
      // console.log('playBeat: '+bar+'/'+beat)
      if (!this.playing) return;
      // console.log('player: bar: {0} beat: {1}'.format(bar, beat));

      var playbackStart = bar === this.playbackRange.start.bar && beat === this.playbackRange.start.beat;

      var isPlaybackEnd = playbackStart && !initializationBeat;
      var timeSignature = this.section.timeSignature;
      var currentTime = context.currentTime;
      var beatTime = 60/(this.bpm * this.playbackSpeed);
      // console.log('bpm: '+this.bpm)

      if (!isPlaybackEnd) {
        // console.log('Play beat: '+beat);
        for (var trackId in this.section.tracks) {
          var track = this.section.tracks[trackId];
          var trackBeat = track.beat(bar, beat);
          track.beatSounds(trackBeat).forEach(function(sound) {
            if (sound.muted) return;
            var startAt = startTime + (sound.start * beatTime);
            try {
              if (track.type === 'bass') {
                this._playBassSound(trackId, track, sound, startAt, beatTime);
              } else if (track.type === 'drums') {
                this._playDrumSound(track, sound, startAt);
              } else {
                this._playSound(trackId, track, sound, startAt, beatTime);
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
        if (this.audioTrack && this.audioTrack.track.playbackRate !== this.playbackSpeed) {
          this.audioTrack.track.setPlaybackRate(this.playbackSpeed, startTime-currentTime);
        }
      }

      if (this.scheduledSounds.length) {
        this.scheduledSounds = this.scheduledSounds.filter(function(playingNote) {
          return currentTime <= playingNote.endTime;
        });
      }

      if (isPlaybackEnd) {
        this.stop(false, {
          eventTime: currentTime,
          endTime: startTime
        });
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

    AudioPlayer.prototype._play = function(options) {
      // setup 'silent' source. It's needed for proper graph
      // visualization when no other source is playing
      // var gain = context.createGain();
      // gain.gain.value = 0.0001;
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
      var start = options.start || this.playbackRange.start;
      var bar = start.bar;
      var beat = start.beat;

      this.audioTrack = options.audioTrack;
      if (options.audioTrack && options.audioTrack.track.initialized && !options.audioTrack.track.playing) {
        var playbackStart = ((bar-1)*this.section.timeSignature.top + beat-1)*(60/this.bpm);
        if (options.audioTrack.start) {
          var offset = options.audioTrack.start;
          playbackStart += offset[0] * 60 + offset[1] + offset[2]/1000;
        }

        options.audioTrack.track.setPlaybackRate(this.playbackSpeed);

        options.audioTrack.track.play(playbackStart)
          .then(function() {

            // if (!this.ts) {
            //   this.ts = context.currentTime;
            //   this.at_ts = options.audioTrack.track._stream.currentTime;
            // }

            this.playBeat(bar, beat, Math.max(context.currentTime, options.startTime || 0), true);
          }.bind(this))
          .catch(function(error) {
            // Report notification
          })
      } else {
        this.playBeat(bar, beat, Math.max(context.currentTime, options.startTime || 0), true);
      }
    };

    AudioPlayer.prototype.setBpm = function(bpm) {
      this._bpm = bpm;
    }

    AudioPlayer.prototype.setPlaybackSpeed = function(playbackSpeed) {
      this.playbackSpeed = playbackSpeed;
    };

    AudioPlayer.prototype.fetchSoundResources = function(track, sound) {
      if (sound.style && sound.note) {
        var resources = this._getSoundHandler(sound).getResources(track, sound);
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
          if (track.type === 'drums') {
            track.forEachSound(function(drumSound) {
              addResources([track.instrument.drumMap[drumSound.drum].filename])
            })
          }
          if (track.type === 'bass') {
            track.forEachSound(function(bassSound) {
              if (bassSound.note && bassSound.style) {
                addResources(this._getSoundHandler(bassSound).getResources(track, bassSound));
              }
            }, this);
          }
          if (track.type === 'piano') {
            track.data.forEach(function(beat) {
              beat.data.forEach(function(sound) {
                addResources(this.piano.getHandler(sound).getResources(track, sound));
              }, this)
            }, this);
          }
        }
      }, this);
      // console.log(resources);
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


    AudioPlayer.prototype.export = function(sections, audioTrack) {
      var playbackSpeed = this.playbackSpeed;
      var duration = sections.reduce(function(duration, section, index) {
        var bpm = (audioTrack[index] || section).bpm;
        var beatTime = 60/(bpm * playbackSpeed);
        return duration + (section.timeSignature.top * section.length * beatTime);
      }, 0);
      var offlineCtx = new OfflineAudioContext(2, 44100*(duration+0.1), 44100);

      var outputs = {};
      pm.project.tracks.forEach(function(track) {
        var audio = offlineCtx.createGain();
        audio.gain.value = track.audio.gain.value;
        audio.chain = [];
        audio.connect(offlineCtx.destination);
        outputs[track.id] = audio;
      });
      sections.forEach(function(section) {
        for (var trackId in section.tracks) {
          section.tracks[trackId].audio = outputs[trackId];
        }
      });

      var _this = this;
      function exportBeat(tracks, bar, beat, startTime, beatTime) {
        for (var trackId in tracks) {
          var track = tracks[trackId];
          var trackBeat = track.beat(bar, beat);
          track.beatSounds(trackBeat).forEach(function(sound) {
            if (sound.muted) return;
            var startAt = startTime + (sound.start * beatTime);;
            try {
              if (track.type === 'bass') {
                _this._playBassSound(trackId, track, sound, startAt, beatTime);
              } else if (track.type === 'drums') {
                _this._playDrumSound(track, sound, startAt);
              } else {
                _this._playSound(trackId, track, sound, startAt, beatTime);
              }
            } catch (ex) {
              if (ex instanceof ResourceNotAvailable) {
                console.log('Failed to load resource: '+ex.resource);
              }
            }
          });
        }
      }

      this.fetchResources(sections)
        .then(function() {
          // generate sounds
          var beatStart = offlineCtx.currentTime;
          sections.forEach(function(section, index) {
            var bpm = audioTrack? audioTrack[index].bpm : section.bpm;
            var beatTime = 60/(bpm * playbackSpeed);
            for (var bar = 1; bar <= section.length; bar++) {
              for (var beat = 1; beat <= section.timeSignature.top; beat++) {
                exportBeat(section.tracks, bar, beat, beatStart, beatTime);
                beatStart += beatTime;
              }
            }
          });
          // handle audio track
          if (audioTrack) {
            var stream = pm.project.audioTrack._stream.cloneNode();
            var source = offlineCtx.createMediaElementSource(stream);
            var gain = offlineCtx.createGain();
            gain.gain.value = audioTrack[0].track.audio.volume;
            source.connect(offlineCtx.destination);

            var offset = audioTrack[0].start;
            stream.currentTime = offset[0] * 60 + offset[1] + offset[2]/1000;
            return stream.play();
          } else {
            return Promise.resolve();
          }
        })
        .then(function() {
          return offlineCtx.startRendering();
        })
        .then(function(renderedBuffer) {
          sections.forEach(function(section) {
            for (var trackId in section.tracks) {
              section.tracks[trackId].audio = pm.project.tracksMap[trackId].audio;
            }
          });
          var wav = audioBufferToWav(renderedBuffer);
          var blob = new window.Blob([ new DataView(wav) ], {
            type: 'audio/wav'
          });
          saveAs(blob, 'export.wav');
        });
    }

    AudioPlayer.prototype.play = function(section, beatPrepared, playbackStopped, options) {
      options = options || {};
      this.section = section;
      this.playing = true;
      this.lastSyncTimerId = 0;

      var player = this;
      this.beatPreparedCallback = angular.isFunction(beatPrepared)? beatPrepared : angular.noop;
      this.playbackStoppedCallback = angular.isFunction(playbackStopped)? playbackStopped : angular.noop;

      var count = options.countdown? 3 : 0;
      function countDownTick() {
        if (count > 0) {
          count--;
          if (player.playing) {
            player._playDrumStick();
            setTimeout(countDownTick, 60000/(player.bpm * player.playbackSpeed));
          }
        } else {
          player._play(options);
        }
      }
      countDownTick();
    };

    AudioPlayer.prototype.stop = function(hard, info) {
      this.playing = false;
      if (this.lastSyncTimerId) {
        clearTimeout(this.lastSyncTimerId);
      }
      if (hard) {
        var currentTime = context.currentTime;
        this.scheduledSounds.forEach(function(sound) {
          try {
            if (currentTime < sound.startTime) {
              sound.source.stop();
            } else {
              sound.gain.cancelScheduledValues(currentTime);
              sound.gain.setValueAtTime(sound.gain.value, currentTime+0.01);
              sound.gain.linearRampToValueAtTime(0.00001, currentTime+0.05);
            }
          } catch (ex) {
            console.log('Error');
          }
        });
        this.scheduledSounds = [];
      }
      // if (this.audioTrack) {
      //   this.audioTrack.track.stop();
      // }
      /*
      this.oscillator.stop();
      this.oscillator.disconnect();
      this.oscillator.output.disconnect();
      */
      this.dispatchEvent('playbackStopped');
      this.playbackStoppedCallback(info);
    };

    AudioPlayer.prototype.playBassSample = function(track, bassSound) {
      var resources = this._getSoundHandler(bassSound).getResources(track, bassSound);
      if (bassSound.next) {
        var nextSound = bassSound;
        while (nextSound.next) {
          nextSound = track.nextSound(nextSound);
          if (!nextSound) break;
          var nextResources = this._getSoundHandler(nextSound).getResources(track, nextSound);
          nextResources.forEach(function(resource) {
            if (resources.indexOf(resource) === -1) {
              resources.push(resource);
            }
          });
        }
      }
      // console.log(resources);

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
            60 / (player.bpm * player.playbackSpeed)
          );
          player.playingBassSample.source.playing = true;
          player.playingBassSample.source.addEventListener('ended', function(evt) {
            evt.target.playing = false;
          });
        }, 50);
      }
      this.bufferLoader.loadResources(resources, afterLoad);
    };

    AudioPlayer.prototype.playPianoSample = function(track, sounds) {
      var _this = this;
      if (!angular.isArray(sounds)) {
        sounds = [sounds];
      }
      var resources = sounds.map(function(sound) {
        sound.start = 0;
        sound.end = 1;
        return _this.piano.getHandler(sound).getResources(track, sound)[0];
      });
      this.bufferLoader.loadResources(
        resources,
        // this._playSound.bind(this, track.id, track, {subdivision: 4}, sounds[0], context.currentTime, 1)
        function() {
          sounds.forEach(function(sound) {
            _this._playSound(track.id, track, sound, context.currentTime, 1);
          });
        }
      );
    };

    AudioPlayer.prototype.playDrumSample = function(track, drumSound) {
      this.bufferLoader.loadResource(
        track.instrument.drumMap[drumSound.drum].filename,
        this._playDrumSound.bind(this, track, drumSound, context.currentTime)
      );
    };

    return new AudioPlayer();
  }
})();