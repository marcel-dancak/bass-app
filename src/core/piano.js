import { Note } from 'tonal'
import { asciNote, unicodeNote, noteProps, enharmonic } from '../core/note-utils'
import { bufferLoader, ResourceNotAvailable } from './buffer-loader'
import { Audio } from './instrument'
import AudioUtils from './audio-utils'


function buildSamplesCache(baseSamples, range=['C0', 'C7']) {
  baseSamples = baseSamples.split(' ')
  const baseSamplesNotes = baseSamples.map(name => Note.props(name))

  const firstNote = Note.props(asciNote(range[0]))
  const lastNote = Note.props(asciNote(range[1]))
  const samples = {}
  for (let i = firstNote.midi; i <= lastNote.midi; i++) {
    const note = Note.props(Note.fromMidi(i))

    let closestIndex = -1
    let closestShift = 100
    baseSamplesNotes.forEach((sample, i) => {
      const shift = note.midi - sample.midi
      if (Math.abs(shift) < Math.abs(closestShift)) {
        closestShift = shift
        closestIndex = i
      }
    })
    const closestSample = {
      name: baseSamples[closestIndex],
      shift: closestShift
    }
    samples[unicodeNote(note.name)] = closestSample
    samples[unicodeNote(Note.enharmonic(note.name))] = closestSample
  }
  return samples
}

const samples = {
  acoustic: 'C1 Eb1 Gb1 A1 C2 Eb2 Gb2 A2 C3 Eb3 Gb3 A3 C4 Eb4 Gb4 A4 C5 Eb5 Gb5 A5 C6 Eb6 Gb6 A6 C7 Eb7 Gb7 A7',
  electric: 'F1 B1 E2 A2 D3 G3 B3 D4 F4 B4 E5 A5 D6 G6 C7' // jRhodes3
}

const SamplesMap = {
  acoustic: buildSamplesCache(samples.acoustic),
  electric: buildSamplesCache(samples.electric)
}

let output = null

function noteRealDuration (sound, beatTime) {
  let duration = (sound.end - sound.start) * beatTime
  if (sound.note.staccato) {
    duration = 0.95 * duration - (beatTime / 4) * 0.2
  }
  return duration - (sound.offset || 0)
}

function createSoundAudio (sound, beatTime, resource, params = {}) {
  let audioData
  switch (typeof resource) {
    case 'undefined':
      resource = 0 // eslint-disable-line no-fallthrough
    case 'number':
      resource = this.soundResources(sound)[resource] // eslint-disable-line no-fallthrough
    case 'string':
      audioData = bufferLoader.loadResource(resource)
      if (!audioData) {
        throw new ResourceNotAvailable(resource)
      }
      break
    default:
      audioData = resource
  }

  const duration = noteRealDuration(sound, beatTime) + 0.175
  const minDuration = Math.max(duration, params.duration || 0)
  // this.composer.enlarge(sound, audioData, 6);
  if (audioData.duration < minDuration) {
    const note = params.note || sound.note
    if (note && note.name) {
      audioData = this.composer.enlarge(note, audioData, minDuration)
    }
  }

  const source = output.context.createBufferSource()
  const gain = output.context.createGain()
  gain.gain.value = sound.volume
  source.connect(gain)
  gain.connect(output)
  source.buffer = audioData
  return Object.assign(Object.create(Audio), {
    sound: sound,
    source: source,
    gain: gain.gain,
    duration: duration,
    offset: 0
  })
}

export default function Piano (params) {

  function soundSample (sound) {
    return SamplesMap[params.preset][sound.note.name + sound.note.octave]
  }

  let playingSounds = {}
  return {
    config: params,
    soundResources (sound) {
      const sample = soundSample(sound)
      return [`piano/${params.preset}/${sample.name}`]
    },

    createSoundAudio (sound, beatTime, resource, params = {}) {
      const audio = createSoundAudio.apply(this, arguments)
      // const audio = createSoundAudio(sound, beatTime, resource, params)
      audio.onplay = () => {
        const sound = audio.sound
        playingSounds[noteProps(sound.note).midi] = audio
      }
      return audio
    },
    playSound (outputAudio, sound, startTime, beatTime) {
      output = outputAudio
      if (sound.prev) {
        const prevAudio = playingSounds[noteProps(sound.note).midi]
        // console.log('prevAudio', prevAudio)
        if (prevAudio) {
          prevAudio.cancelFadeOut()
          prevAudio.addDuration(noteRealDuration(sound, beatTime))
          prevAudio.fadeOut(0.075)
        }
        return
      }

      const audio = this.createSoundAudio(sound, beatTime)
      const sample = soundSample(sound)
      const rate = Math.pow(Math.pow(2, 1/12), sample.shift)
      audio.source.playbackRate.value = rate
      audio.play(startTime)
      audio.fadeOut(0.075)
    }
  }
}

/*
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
*/
