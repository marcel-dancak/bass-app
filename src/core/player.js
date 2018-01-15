function ResourceNotAvailable(resource) {
  this.resource = resource;
}

function Player(context) {

  const tracks = {};
  const bufferLoader = new BufferLoader(context, '/sounds/', true);

  return {
    playbackSpeed: 1,
    tracks,

    addTrack(config) {
      const audio = AudioTrack(context);
      tracks[config.id] = {
        id: config.id,
        audio: audio,
        instrument: StringInstrument(context, audio, bufferLoader)
      };
    },

    collectResources(section) {
      const resources = new Set();
      for (let id in section.tracks) {
        const sTrack = section.tracks[id].forEachSound(s => {
          tracks[id].instrument.soundResources(s).forEach(r => resources.add(r));
        });
      }
      // console.log(resources);
      return Array.from(resources);
    },

    fetchResources(section) {
      return new Promise((resolve, reject) => {
        bufferLoader.loadResources(this.collectResources(section), resolve, reject);
      });
    },

    playBeat(section, bar, beat, startTime) {
      // console.log('playBeat', bar, beat, startTime);
      const beatTime = 60/(section.bpm * this.playbackSpeed);
      // Object.values(section.tracks).forEach(track => {});
      for (let id in section.tracks) {
        const sTrack = section.tracks[id];
        const instrument = tracks[sTrack.id].instrument;
        sTrack.beatSounds(sTrack.beat(bar, beat)).forEach(sound => {
          const startAt = startTime + (sound.start * beatTime);
          instrument.playSound(sound, startAt, beatTime);
        });
      }
      return startTime + beatTime;
    },

    play(section) {
      this.fetchResources(section).then(() => {
        let bar = 1;
        let beat = 1;
        let end = this.playBeat(section, bar, beat, context.currentTime);
        const playNext = (startTime) => {
          beat++;
          if (beat > section.timeSignature.top) {
            beat = 1;
            bar++;
          }
          if (bar <= section.length) {
            end = this.playBeat(section, bar, beat, startTime);
            setTimeout(playNext, (end - context.currentTime - 0.15)*1000, end);
          } else {
            console.log('End', bar, beat);
          }
        }
        setTimeout(playNext, (end - context.currentTime - 0.15)*1000, end);
      });
    },

    export(section) {
      const duration = 5;
      const offlineContext = new OfflineAudioContext(2, 44100*(duration+0.1), 44100);

      const exportTracks = {};
      Object.keys(tracks).forEach(id => {
        exportTracks[id] = {
          instrument: StringInstrument(offlineContext, AudioTrack(offlineContext), bufferLoader)
        };
      });
      
      this.fetchResources(section).then(() => {
        for (let id in section.tracks) {
          const sTrack = section.tracks[id];
          const instrument = exportTracks[sTrack.id].instrument;

          let startTime = 0;
          sTrack.forEachBeat(beat => {
            const beatTime = 60 / section.bpm;
            sTrack.beatSounds(beat).forEach(sound => {
              instrument.playSound(sound, startTime + (sound.start * beatTime), beatTime);
            });
            startTime += beatTime;
          });
        }

        offlineContext.startRendering().then(renderedBuffer => {
          const wav = audioBufferToWav(renderedBuffer);
          const blob = new window.Blob([ new DataView(wav) ], {
            type: 'audio/wav'
          });
          saveAs(blob, 'export.wav');
        });
      });
    }
  }
}

// Effects:

// Hammer on & Pull off
// Slide
// Ring
// Grace
// Bend
// Ghost
// Harmonics
// Regular

function StringInstrument(context, output, bufferLoader, params) {
  // keep references to last audio (per string)

  const playingSounds = {};

  const Audio = {
    play(start, offset = 0) {
      this.startTime = start;
      this.endTime = start + this.duration;
      this.offset = offset;
      this.source.start(start, offset);

      if (!playingSounds[this.sound.string]) {
        playingSounds[this.sound.string] = [];
      }
      playingSounds[this.sound.string].push(this);
    },
    fadeOut() {
      this._fadeOut = {
        time: this.endTime-0.016,
        gain: this.slide? this.slide.volume : this.gain.value
      };
      this.gain.setValueAtTime(this._fadeOut.gain, this._fadeOut.time);
      this.gain.linearRampToValueAtTime(0.000001, this.endTime);
    },
    cancelFadeOut() {
      if (this._fadeOut) {
        this.gain.cancelScheduledValues(this._fadeOut.time-0.01);
        this._fadeOut = null;
      }
    },
    stop(time) {
      this.gain.setValueAtTime(0.000001, time);
    },
    addDuration(duration) {
      this.cancelFadeOut();
      this.endTime += duration;
      this.duration += duration;
    }
  }

  function noteRealDuration(sound, beatTime) {
    let duration = (sound.end-sound.start) * beatTime;
    if (sound.note.staccato) {
      duration = 0.95*duration-(beatTime/4)*0.2;
    }
    return duration-(sound.offset || 0);
  }

  function createSoundAudio(sound, beatTime, resource, params = {}) {
    let audioData;
    switch (typeof resource) {
      case 'undefined':
        resource = 0;
      case 'number':
        resource = this.getResources(sound)[resource];
      case 'string':
        audioData = bufferLoader.loadResource(resource);
        if (!audioData) {
          throw new ResourceNotAvailable(resource);
        }
        break;
      default:
        audioData = resource;
    }

    const duration = noteRealDuration(sound, beatTime);
    const minDuration = Math.max(duration, params.duration || 0);
    // this.composer.enlarge(sound, audioData, 6);
    if (audioData.duration < minDuration) {
      const note = params.note || sound.note;
      if (note && note.name) {
        audioData = this.composer.enlarge(note, audioData, minDuration);
      }
    }

    const source = context.createBufferSource();
    const gain = context.createGain();
    gain.gain.value = sound.volume;
    source.connect(gain);
    gain.connect(output);
    source.buffer = audioData;
    return Object.assign(Object.create(Audio), {
      sound: sound,
      source: source,
      gain: gain.gain,
      duration: duration,
      offset: 0
    });
  }

  function lastSoundAudio(string) {
    const stringSounds = playingSounds[string];
    if (stringSounds) {
      return stringSounds[stringSounds.length-1];
    }
  }

  const handlers = [
    {
      filter: (sound) => (sound.style === 'hammer' || sound.style === 'pull'),
      getResources(sound) {
        const rootSound = sound.beat.section.rootSoundOf(sound);
        return [`bass/${rootSound.style}/${sound.string}${sound.note.fret}`];
      },
      startPlayback(sound, startTime, beatTime) {
        const audio = this.createSoundAudio(sound, beatTime);
        audio.play(startTime, 0.1);
        return audio;
      },
      continuePlayback(sound, startTime, beatTime) {
        const prevAudio = lastSoundAudio(sound.string);
        const audio = this.createSoundAudio(sound, beatTime);
        AudioUtils.join(prevAudio, audio);
        return audio;
      }
    },
    {
      filter: (sound) => (sound.note.type === 'slide'),
      getResources(sound) {
        const rootSound = sound.beat.section.rootSoundOf(sound);
        const step = sound.note.fret > sound.endNote.fret? -1 : 1;
        const outOfRange = sound.endNote.fret + step;
        const resources = [];
        for (let i = sound.note.fret; i !== outOfRange; i += step) {
          resources.push(`bass/${rootSound.style}/${sound.string}${i}`);
        }
        return resources;
      },
      slideCurve(sound, beatTime, slideStartOffset, slideEndOffset) {
        const duration = noteRealDuration(sound, beatTime);

        const steps = Math.abs(sound.note.fret - sound.endNote.fret);
        const curve = new Array(steps + 2);
        curve[0] = Math.max(duration * slideStartOffset, 0.02);
        curve[curve.length-1] = Math.max(duration * slideEndOffset, 0.02);
        const slideDuration = duration - curve[0] - curve[curve.length - 1];

        if (sound.note.slide.easing) {
          const easing = new BezierEasing(...sound.note.slide.easing);
          for (let i = 1; i <= steps; i++) {
            const x = easing(i/steps) - easing((i -1)/steps);
            curve[i] = x * slideDuration;
          }
        } else {
          const stepDuration = slideDuration / steps;
          curve.fill(stepDuration, 1, 1+steps);
        }
        return curve;
      },
      startPlayback(sound, startTime, beatTime) {
        const s = sound.note.slide.start || 0.2;
        const e = sound.note.slide.end || 0.8;
        const curve = this.slideCurve(sound, beatTime, s, 1-e);

        const resources = this.getResources(sound);
        const samples = resources.map(resource => createSoundAudio(sound, beatTime, resource));
        return AudioUtils.audioSlide(null, sound, curve, startTime, beatTime, samples);;
      },
      continuePlayback(sound, startTime, beatTime) {
        const prevAudio = lastSoundAudio(sound.string);
        if (prevAudio) {
          prevAudio.addDuration(noteRealDuration(sound, beatTime));
        }
        return prevAudio;
      }
    },
    {
      filter: (sound) => (sound.style === 'ring'),
      getResources: function(sound) {
        const rootSound = sound.beat.section.rootSoundOf(sound);
        return ['bass/{0}/{1}{2}'.format(rootSound.style, sound.string, sound.note.fret)];
      },
      startPlayback(sound, startTime, beatTime) {
        const audio = this.createSoundAudio(sound, beatTime);
        audio.play(startTime, 0.1);
        return audio;
      },
      continuePlayback(sound, startTime, beatTime) {
        const prevAudio = lastSoundAudio(sound.string);
        if (prevAudio) {
          prevAudio.addDuration(noteRealDuration(sound, beatTime));
        }
        return prevAudio;
      }
    },
    {
      filter: (sound) => (sound.note.type === 'ghost'),
      getResources(sound) {
        return [`bass/${sound.style}/${sound.string}X`];
      },
      startPlayback(sound, startTime, beatTime) {
        const audio = this.createSoundAudio(sound, beatTime);
        audio.duration = Math.min(audio.duration, audio.source.buffer.duration)-0.02;
        audio.play(startTime);
        return audio;
      }
    },
    {
      filter: (sound) => (sound.note.type === 'regular'),
      getResources(sound) {
        return [`bass/${sound.style}/${sound.string}${sound.note.fret}`];
      },
      startPlayback(sound, startTime, beatTime) {
        const audio = this.createSoundAudio(sound, beatTime);
        audio.play(startTime);
        return audio;
      },
      continuePlayback(sound, startTime, beatTime) {}
    }
  ];
  handlers.forEach(h => h.createSoundAudio = createSoundAudio);

  return {
    soundResources(sound) {
      const handler = handlers.find(h => h.filter(sound));
      return handler.getResources(sound);
    },
    playSound(sound, startTime, beatTime) {
      const handler = handlers.find(h => h.filter(sound));

      let lastSegment;
      if (sound.prev) {
        const prevAudio = lastSoundAudio(sound.string);
        if (prevAudio) {
          prevAudio.cancelFadeOut();
          lastSegment = handler.continuePlayback(sound, startTime, beatTime);
        }
      }
      if (!lastSegment) {
        lastSegment = handler.startPlayback(sound, startTime, beatTime);
      }
      if (lastSegment) {
        lastSegment.fadeOut();
      }
    }
  };
}

function KeyInstrument() {}
function PercussionInstrument() {}


function Section(params) {
  const tracks = {};
  return {
    bpm: params.bpm,
    timeSignature: params.timeSignature,
    length: params.length,
    tracks,
    addBass(id, data) {
      const track = new NotesTrackSection(params, data);
      track.id = id;
      tracks[id] = track;
      return track;
    }
  }
}

// Play => Fetch resources =>


const bassData = [
  {
    bar: 1,
    beat: 1,
    subdivision: 4,
    data: [
      {
        style: 'finger',
        string: 'A',
        start: 0,
        volume: 0.75,
        note: {
          type: 'regular',
          fret: 3,
          name: 'C',
          length: 8
        }
      },
      {
        style: 'slap',
        string: 'A',
        start: 0.5,
        volume: 0.75,
        next: true,
        note: {
          type: 'regular',
          fret: 5,
          name: 'D',
          length: 16
        }
      },
      {
        style: 'hammer',
        string: 'A',
        start: 0.75,
        volume: 0.75,
        prev: true,
        next: true,
        note: {
          type: 'regular',
          fret: 7,
          name: 'E',
          length: 16
        }
      }
    ]
  },
  {
    bar: 1,
    beat: 2,
    subdivision: 4,
    data: [
      {
        style: 'ring',
        string: 'A',
        start: 0,
        volume: 0.75,
        prev: true,
        note: {
          type: 'regular',
          fret: 7,
          name: 'E',
          length: 8
        }
      },
      {
        style: 'pop',
        string: 'G',
        start: 0.75,
        volume: 0.75,
        note: {
          type: 'regular',
          fret: 9,
          name: 'E',
          length: 16
        }
      }
    ]
  }
];

const section = Section({
  timeSignature: {
    top: 4,
    bottom: 4
  },
  length: 1,
  bpm: 80
});
section.addBass('bass_0', bassData);

const player = Player(new AudioContext());
player.addTrack({
  id: 'bass_0',
  instrument: {},
  audio: {}
});

// player.addTrack(BassAudioTrack(track))
// player.addTrack(trackConfig);
// player.addStreamTrack(config);

// player.play(section);
// player.export(section);

// window.play = () => player.play(section);
window.play = () => {
  const section = Section(workspace.section);
  section.addBass('bass_0', workspace.trackSection.data);
  player.play(section);
}

window.ep = player;