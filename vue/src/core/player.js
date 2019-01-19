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

    // fetchResources (section) {
    //   return new Promise((resolve, reject) => {
    //     bufferLoader.loadResources(this.collectResources(section), resolve, reject)
    //   })
    // },

    fetchResources (resources) {
      return new Promise((resolve, reject) => {
        bufferLoader.loadResources(resources, resolve, reject)
      })
    },

    playBeat (section, bar, beat, startTime, opts) {
      // console.log('playBeat', bar, beat, startTime)
      const beatTime = 60 / (section.bpm * this.playbackSpeed)
      // Object.values(section.tracks).forEach(track => {})

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
        id: opts.id,
        section,
        bar,
        beat,
        startTime,
        eventTime: context.currentTime,
        endTime: startTime + beatTime,
        duration: beatTime
        // playbackActive: !isPlaybackEnd,
        // playbackStart: playbackStart
      }
      this.beatPreparedCb(evt)

      if (this.playing) {
        if (!evt.stop) {
          beat++
          if (beat > section.timeSignature.top) {
            beat = 1
            bar++
          }
        }
        if (evt.stop || bar > section.length) {
          const next = opts.playbackEnd ? opts.playbackEnd() : null
          if (!next) {
            setTimeout(() => {this.playing = false}, (evt.endTime - evt.eventTime) * 1000)
            return
          }
          section = next.section || section
          bar = next.bar
          beat = next.beat
          opts.id = next.id || opts.id
        }

        setTimeout(
          () => this.playBeat(section, bar, beat, evt.endTime, opts),
          (evt.endTime - evt.eventTime - 0.15) * 1000
        )
      }
    },

    play (section, beatPrepared, opts = {}) {
      this.playing = true
      this.beatPreparedCb = beatPrepared
      // const endCallback = opts.playbackEnd || (() => {})
      // this.fetchResources(section).then(() => {
        let bar = opts.start ? opts.start.bar : 1
        let beat = opts.start ? opts.start.beat : 1
        this.playBeat(section, bar, beat, context.currentTime, opts)
      // })
    },

    stop () {
      this.playing = false
    },

    export (section) {
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

      this.fetchResources(this.collectResources(section)).then(() => {
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

        offlineContext.startRendering().then(renderedBuffer => {
          const wav = audioBufferToWav(renderedBuffer)
          const blob = new window.Blob([ new DataView(wav) ], {
            type: 'audio/wav'
          })
          saveAs(blob, 'export.wav')
        })
      })
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
