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
      this.input = {
        muted: true,
        audio: context.createGain()
      };
      this.input.audio.gain.value = 0.001;
      this.bufferLoader.loadResource('sounds/drums/drumstick');
    }

    var bassSounds = {
      finger: {
        getResources: function(sound) {
          var note = sound.note;
          if (note.type === 'ghost') {
            return ['sounds/bass/finger/X{0}'.format(sound.string+1)];
          }
          // return ['sounds/bass/finger/sine'.format(noteFileName[note.name], note.octave||'')];
          return ['sounds/bass/finger12/{0}{1}'.format(noteFileName[note.name], note.octave||'')];
        }
      },
      hammer: {
        getResources: function(sound) {
          var note = sound.note;
          return ['sounds/bass/tap/{0}{1}'.format(noteFileName[note.name], note.octave||'')];
        }
      },
      pull: {
        getResources: function(sound) {
          var note = sound.note;
          return ['sounds/bass/tap/{0}{1}'.format(noteFileName[note.name], note.octave||'')];
        }
      },
      slap: {
        getResources: function(sound) {
          var note = sound.note;
          return ['sounds/bass/slap/{0}{1}'.format(noteFileName[note.name], note.octave||'')];
        }
      },
      pop: {
        getResources: function(sound) {
          var note = sound.note;
          return ['sounds/bass/pop/{0}{1}'.format(noteFileName[note.name], note.octave||'')];
        }
      }
    };

    AudioPlayer.prototype._playDrumStick = function(sound) {
      var audioData = this.bufferLoader.loadResource('sounds/drums/drumstick');
      var source = context.createBufferSource();
      source.buffer = audioData;
      source.connect(context.destination);
      source.start(context.currentTime, 0, 0.2);
    };

    AudioPlayer.prototype._playDrumsSound = function(sound, startTime) {
      console.log(sound);
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
      var audioData = this.bufferLoader.loadResource(bassSounds[sound.style].getResources(sound)[0]);
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

        var endTime;
        gain.gain.setValueAtTime(sound.volume, startTime);

        if (note.type === 'slide') {
          endTime = startTime+duration;
          source.start(startTime, 0, endTime);
          gain.gain.linearRampToValueAtTime(0.001, endTime);
          var semitoneRatio = Math.pow(2, 1/12);
          var endRate = Math.pow(semitoneRatio, note.slide || 0);
          source.playbackRate.setValueAtTime(1, startTime);
          source.playbackRate.linearRampToValueAtTime(endRate, endTime);
        } else if (sound.style === 'hammer') {
          endTime = startTime+duration+0.05;
          gain.gain.setValueAtTime(sound.volume/1.3, startTime);
          source.start(startTime, 0, endTime);

          gain.gain.linearRampToValueAtTime(sound.volume/1.6, startTime+0.05);
          gain.gain.setValueAtTime(sound.volume/1.6, endTime-0.05);
          gain.gain.linearRampToValueAtTime(0.001, endTime);
        } else {
          if (sound.next) {
            endTime = startTime+duration+0.01;
            source.start(startTime, 0, endTime);
            gain.gain.setValueAtTime(sound.volume, endTime-0.01);
            gain.gain.linearRampToValueAtTime(0.001, endTime);
          } else {
            endTime = startTime+duration+0.01;
            source.start(startTime, 0, endTime);
            gain.gain.setValueAtTime(sound.volume, endTime-0.02);
            gain.gain.linearRampToValueAtTime(0.0001, endTime);
          }
        }
        var playingSound = {
          note: note,
          source: source,
          gain: gain,
          startTime: startTime,
          endTime: startTime+duration
        };

        this.playingNotes.push(playingSound);
        return playingSound;
      }
    };

    AudioPlayer.prototype.playBeat = function(bar, beat, startTime) {
      if (!this.playing) return;

      // console.log('Play beat: '+beat);
      var timeSignature = this.composition.timeSignature;
      var currentTime = context.currentTime;
      var bassBeat = this.composition.bassBeat(bar, beat);
      var bassSounds = this.composition.getBassSounds(bassBeat);
      var beatTime = 60/this.bpm;
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

      this.beatPreparedCallback({
        bar: bar,
        beat: beat,
        eventTime: currentTime,
        startTime: startTime,
        endTime: startTime+beatTime,
        duration: beatTime,
        timeSignature: this.composition.timeSignature,
        flatIndex: (bar-1)*this.composition.timeSignature.top+beat-1
      });


      var isLastBeatInBar = beat === timeSignature.top;
      var isLastBar = isLastBeatInBar && bar === this.composition.length;
      var nextBar = isLastBar? 1 : isLastBeatInBar? bar+1 : bar;
      var nextBeat = isLastBeatInBar? 1 : beat+1;
      var nextBeatStart = startTime+beatTime;
      // setup next beat's sounds ahead some time
      var schedule = 1000*(nextBeatStart - currentTime - 0.15);
      schedule = Math.max(schedule, 15);
      setTimeout(this.playBeat.bind(this), schedule, nextBar, nextBeat, nextBeatStart);
    };

    AudioPlayer.prototype.playback = function() {
      if (this.playing) {

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
      // oscGain.gain.value = 0.0001;
      oscGain.gain.value = 0.0033;
      oscillator.connect(oscGain);
      oscGain.connect(this.bass.audio);
      oscillator.frequency.value = 40;
      oscillator.start();
      this.oscillator = oscillator;

      this.composition = composition;
      this.playBeat(1, 1, context.currentTime);
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

    AudioPlayer.prototype.play = function(section, beatPreparedCallback) {
      console.log('PLAY');
      var player = this;
      this.beatPreparedCallback = angular.isFunction(beatPreparedCallback)? beatPreparedCallback : angular.noop;
      function afterLoad() {
        var count = 0;
        function countdown() {
          if (count > 0) {
            count--;
            player._playDrumStick();
            setTimeout(countdown, 60000/player.bpm);
          } else {
            player._play(section);
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
        afterLoad();
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

    AudioPlayer.prototype.playBassSample = function(bassSound) {
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