import saveAs from 'file-saver'
import audioBufferToWav from 'audiobuffer-to-wav'
import { AudioTrack } from './audio-track'
import { bufferLoader } from './buffer-loader'


export default function Player (context) {
  const tracks = {}

  return {
    context,
    tracks,
    playbackSpeed: 1,
    playing: false,

    addTrack (config) {
      const audio = AudioTrack(context)
      tracks[config.id] = {
        id: config.id,
        audio: audio,
        instrument: config.instrument
      }
    },

    addAudioTrack (config) {
      const stream = new Audio(config.source.resource)
      stream.autoplay = false
      stream.preload = 'none'
      this.audioTrack = {
        playing: false,
        play (offset = 0) {
          this.playing = true
          stream.currentTime = offset
          return stream.play()
        },
        stop () {
          this.playing = false
          stream.pause()
        },
        get currentTime() {
          return stream.currentTime
        },
        set currentTime(value) {
          stream.currentTime = value
        }
      }
    },

    collectResources (section) {
      const resources = new Set()
      for (let id in section.tracks) {
        // if (id.startsWith('piano')) continue
        section.tracks[id].forEachSound(s => {
          tracks[id].instrument.soundResources(s).forEach(r => resources.add(r))
        })
      }
      // console.log(resources);
      return Array.from(resources)
    },

    fetchResources (resources) {
      return new Promise((resolve, reject) => {
        bufferLoader.loadResources(resources, resolve, reject)
      })
    },

    stop () {
      this.playing = false
      if (this.audioTrack) {
        this.audioTrack.stop()
      }
    },

    async playBeat (next, startTime, opts) {
      if (!this.playing) {
        return
      }
      const params = next(startTime, beatTime)
      if (!params) {
        this.stop()
        return
      }

      const { section, bar, beat } = params
      const beatTime = 60 / (section.bpm * this.playbackSpeed)

      if (this.audioTrack && section.audioTrack) {
        const [min, sec, mili] = section.audioTrack.start
        let start = min * 60 + sec + mili / 1000
        const beatsOffset = (bar - 1) * section.timeSignature.top + beat - 1
        const beatTime = 60 / section.bpm
        start += beatsOffset * beatTime

        if (!this.audioTrack.playing) {
          await this.audioTrack.play(start) // expect (startTime === context.currentTime) here
          if (startTime < context.currentTime) {
            startTime = context.currentTime
          }
        } else {
          const diff = Math.abs(start - this.audioTrack.currentTime)
          if (diff > 0.35) {
            setTimeout(
              () => { this.audioTrack.currentTime = start },
              1000 * (startTime - context.currentTime)
            )
          }
        }
      }

      for (let id in section.tracks) {
        const sTrack = section.tracks[id]
        if (!tracks[sTrack.id]) continue // Temporary check

        const { instrument, audio } = tracks[sTrack.id]
        sTrack.beatSounds(sTrack.beat(bar, beat)).forEach(sound => {
          const startAt = startTime + (sound.start * beatTime)
          instrument.playSound(audio, sound, startAt, beatTime)
        })
      }

      const evt = {
        ...params,
        startTime,
        eventTime: context.currentTime,
        endTime: startTime + beatTime,
        duration: beatTime
      }
      this.beatPreparedCb(evt)
      setTimeout(
        () => this.playBeat(next, evt.endTime, opts),
        (evt.endTime - evt.eventTime - 0.15) * 1000
      )
    },

    async playStream (next, beatPrepared, opts = {}) {
      this.playing = true
      this.beatPreparedCb = beatPrepared
      this.playBeat(next, context.currentTime, opts)
    },

    async export (section) {
      const duration = 5
      const offlineContext = new OfflineAudioContext(2, 44100 * (duration + 0.1), 44100)

      const exportTracks = {}
      Object.keys(tracks).forEach(id => {
        console.log(tracks[id])
        exportTracks[id] = {
          audio: AudioTrack(offlineContext),
          instrument: tracks[id].instrument
        }
      })

      await this.fetchResources(this.collectResources(section))
      for (let id in section.tracks) {
        const sTrack = section.tracks[id]
        const { instrument, audio } = exportTracks[sTrack.id]

        let startTime = 0
        sTrack.forEachBeat(beat => {
          const beatTime = 60 / section.bpm
          sTrack.beatSounds(beat).forEach(sound => {
            instrument.playSound(audio, sound, startTime + (sound.start * beatTime), beatTime)
          })
          startTime += beatTime
        })
      }

      const renderedBuffer = await offlineContext.startRendering()
      const wav = audioBufferToWav(renderedBuffer)
      const blob = new window.Blob([ new DataView(wav) ], { type: 'audio/wav' })
      saveAs(blob, 'export.wav')
    }
  }
}


// function KeyInstrument () {}

// Play => Fetch resources =>

/*
const player = Player(new AudioContext())
player.addTrack({
  id: 'bass_0',
  instrument: {},
  audio: {}
})

// player.addTrack(BassAudioTrack(track))
// player.addTrack(trackConfig)
// player.addStreamTrack(config)

// player.play(section)
// player.export(section)

// window.play = () => player.play(section)
window.play = () => {
  const section = Section(workspace.section)
  section.addBass('bass_0', workspace.trackSection.data)
  player.play(section)
}
*/
