import { bufferLoader, ResourceNotAvailable } from './buffer-loader'
import AudioUtils from './audio-utils'

// Effects:

// Hammer on & Pull off
// Slide
// Ring
// Grace
// Bend
// Ghost
// Harmonics
// Regular

export default function StringInstrument (params) {
  let output

  // keep references to last audio (per string)
  // TODO: move to audio track (output)?
  const playingSounds = {}

  const Audio = {
    play (start, offset = 0) {
      this.startTime = start
      this.endTime = start + this.duration
      this.offset = offset
      this.source.start(start, offset)

      if (!playingSounds[this.sound.string]) {
        playingSounds[this.sound.string] = []
      }
      playingSounds[this.sound.string].push(this)
    },
    fadeOut () {
      this._fadeOut = {
        time: this.endTime - 0.016,
        gain: this.slide ? this.slide.volume : this.gain.value
      }
      this.gain.setValueAtTime(this._fadeOut.gain, this._fadeOut.time)
      this.gain.linearRampToValueAtTime(0.000001, this.endTime)
    },
    cancelFadeOut () {
      if (this._fadeOut) {
        this.gain.cancelScheduledValues(this._fadeOut.time - 0.01)
        this._fadeOut = null
      }
    },
    stop (time) {
      this.gain.setValueAtTime(0.000001, time)
    },
    addDuration (duration) {
      this.cancelFadeOut()
      this.endTime += duration
      this.duration += duration
    }
  }

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
        resource = this.getResources(sound)[resource] // eslint-disable-line no-fallthrough
      case 'string':
        audioData = bufferLoader.loadResource(resource)
        if (!audioData) {
          throw new ResourceNotAvailable(resource)
        }
        break
      default:
        audioData = resource
    }

    const duration = noteRealDuration(sound, beatTime)
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

  function lastSoundAudio (string) {
    const stringSounds = playingSounds[string]
    if (stringSounds) {
      return stringSounds[stringSounds.length - 1]
    }
  }

  const handlers = [
    {
      filter: (sound) => (sound.style === 'hammer' || sound.style === 'pull'),
      getResources (sound) {
        const rootSound = sound.beat.section.rootSoundOf(sound)
        return [`bass/${rootSound.style}/${sound.string}${sound.note.fret}`]
      },
      startPlayback (sound, startTime, beatTime) {
        const audio = this.createSoundAudio(sound, beatTime)
        audio.play(startTime, 0.1)
        return audio
      },
      continuePlayback (sound, startTime, beatTime) {
        const prevAudio = lastSoundAudio(sound.string)
        const audio = this.createSoundAudio(sound, beatTime)
        AudioUtils.join(prevAudio, audio)
        return audio
      }
    },
    {
      filter: (sound) => (sound.note.type === 'slide'),
      getResources (sound) {
        const rootSound = sound.beat.section.rootSoundOf(sound)
        const step = sound.note.fret > sound.endNote.fret ? -1 : 1
        const outOfRange = sound.endNote.fret + step
        const resources = []
        for (let i = sound.note.fret; i !== outOfRange; i += step) {
          resources.push(`bass/${rootSound.style}/${sound.string}${i}`)
        }
        return resources
      },
      slideCurve (sound, beatTime, slideStartOffset, slideEndOffset) {
        const duration = noteRealDuration(sound, beatTime)

        const steps = Math.abs(sound.note.fret - sound.endNote.fret)
        const curve = new Array(steps + 2)
        curve[0] = Math.max(duration * slideStartOffset, 0.02)
        curve[curve.length - 1] = Math.max(duration * slideEndOffset, 0.02)
        const slideDuration = duration - curve[0] - curve[curve.length - 1]

        if (sound.note.slide.easing) {
          const easing = new BezierEasing(...sound.note.slide.easing)
          for (let i = 1; i <= steps; i++) {
            const x = easing(i / steps) - easing((i - 1) / steps)
            curve[i] = x * slideDuration
          }
        } else {
          const stepDuration = slideDuration / steps
          curve.fill(stepDuration, 1, 1 + steps)
        }
        return curve
      },
      startPlayback (sound, startTime, beatTime) {
        const s = sound.note.slide.start || 0.2
        const e = sound.note.slide.end || 0.8
        const curve = this.slideCurve(sound, beatTime, s, 1 - e)

        const resources = this.getResources(sound)
        const samples = resources.map(resource => createSoundAudio(sound, beatTime, resource))
        return AudioUtils.slide(null, sound, curve, startTime, beatTime, samples)
      },
      continuePlayback (sound, startTime, beatTime) {
        const prevAudio = lastSoundAudio(sound.string)
        if (prevAudio) {
          prevAudio.addDuration(noteRealDuration(sound, beatTime))
        }
        return prevAudio
      }
    },
    {
      filter: (sound) => (sound.style === 'ring'),
      getResources (sound) {
        const rootSound = sound.beat.section.rootSoundOf(sound)
        return [`bass/${rootSound.style}/${sound.string}${sound.note.fret}`]
      },
      startPlayback (sound, startTime, beatTime) {
        const audio = this.createSoundAudio(sound, beatTime)
        audio.play(startTime, 0.1)
        return audio
      },
      continuePlayback (sound, startTime, beatTime) {
        const prevAudio = lastSoundAudio(sound.string)
        if (prevAudio) {
          prevAudio.addDuration(noteRealDuration(sound, beatTime))
        }
        return prevAudio
      }
    },
    {
      filter: (sound) => (sound.note.type === 'ghost'),
      getResources (sound) {
        return [`bass/${sound.style}/${sound.string}X`]
      },
      startPlayback (sound, startTime, beatTime) {
        const audio = this.createSoundAudio(sound, beatTime)
        audio.duration = Math.min(audio.duration, audio.source.buffer.duration) - 0.02
        audio.play(startTime)
        return audio
      }
    },
    {
      filter: (sound) => sound.note.type === 'grace',
      getResources (sound) {
        return [
          `bass/${sound.style}/${sound.string}${sound.note.fret}`,
          `bass/${sound.style}/${sound.string}${sound.endNote.fret}`
        ]
      },
      startPlayback (sound, startTime, beatTime) {
        const graceTime = 0.08
        const startAudio = this.createSoundAudio(sound, beatTime)
        const endAudio = this.createSoundAudio(sound, beatTime, 1)

        const duration = noteRealDuration(sound, beatTime)
        startAudio.duration = graceTime
        startAudio.endTime = startTime + startAudio.duration

        endAudio.duration = duration - startAudio.duration
        endAudio.endTime = startTime + duration

        AudioUtils.join(startAudio, endAudio)
        startAudio.play(startTime)
        return startAudio
      }
    },
    {
      filter: (sound) => (sound.note.type === 'regular'),
      getResources (sound) {
        return [`bass/${sound.style}/${sound.string}${sound.note.fret}`]
      },
      startPlayback (sound, startTime, beatTime) {
        const audio = this.createSoundAudio(sound, beatTime)
        audio.play(startTime)
        return audio
      },
      continuePlayback (sound, startTime, beatTime) {}
    }
  ]
  handlers.forEach(h => { h.createSoundAudio = createSoundAudio })

  return {
    config: params,
    soundResources (sound) {
      const handler = handlers.find(h => h.filter(sound))
      return handler.getResources(sound)
    },
    playSound (outputAudio, sound, startTime, beatTime) {
      output = outputAudio
      const handler = handlers.find(h => h.filter(sound))

      let lastSegment
      if (sound.prev) {
        const prevAudio = lastSoundAudio(sound.string)
        if (prevAudio) {
          prevAudio.cancelFadeOut()
          lastSegment = handler.continuePlayback(sound, startTime, beatTime)
        }
      }
      if (!lastSegment) {
        lastSegment = handler.startPlayback(sound, startTime, beatTime)
      }
      if (lastSegment) {
        lastSegment.fadeOut()
      }
    }
  }
}
