import saveAs from 'file-saver'
import audioBufferToWav from 'audiobuffer-to-wav'
import { AudioTrack } from './audio-track'
import bufferLoader from './buffer-loader'


function ResourceNotAvailable (resource) {
  this.resource = resource
}

export default function Player (context) {
  const tracks = {}

  return {
    context,
    tracks,
    playbackSpeed: 1,

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
        section.tracks[id].forEachSound(s => {
          tracks[id].instrument.soundResources(s).forEach(r => resources.add(r))
        })
      }
      // console.log(resources);
      return Array.from(resources)
    },

    fetchResources (section) {
      return new Promise((resolve, reject) => {
        bufferLoader.loadResources(this.collectResources(section), resolve, reject)
      })
    },

    playBeat (section, bar, beat, startTime) {
      // console.log('playBeat', bar, beat, startTime)
      const beatTime = 60 / (section.bpm * this.playbackSpeed)
      // Object.values(section.tracks).forEach(track => {})

      for (let id in section.tracks) {
        const sTrack = section.tracks[id]
        const { instrument, audio } = tracks[sTrack.id]
        sTrack.beatSounds(sTrack.beat(bar, beat)).forEach(sound => {
          const startAt = startTime + (sound.start * beatTime)
          instrument.playSound(audio, sound, startAt, beatTime)
        })
      }

      this.beatPreparedCb({
        section: section,
        bar: bar,
        beat: beat,
        eventTime: context.currentTime,
        startTime: startTime,
        endTime: startTime + beatTime,
        duration: beatTime
        // flatIndex: flatIndex,
        // playbackActive: !isPlaybackEnd,
        // playbackStart: playbackStart
      })
      return startTime + beatTime
    },

    play (section, beatPrepared) {
      this.playing = true
      this.beatPreparedCb = beatPrepared
      this.fetchResources(section).then(() => {
        let bar = 1
        let beat = 1
        let end = this.playBeat(section, bar, beat, context.currentTime)
        const playNext = (startTime) => {
          beat++
          if (beat > section.timeSignature.top) {
            beat = 1
            bar++
          }
          if (bar <= section.length && this.playing) {
            end = this.playBeat(section, bar, beat, startTime)
            setTimeout(playNext, (end - context.currentTime - 0.15) * 1000, end)
          } else {
            console.log('End', bar, beat)
            this.playing = false
          }
        }
        setTimeout(playNext, (end - context.currentTime - 0.15) * 1000, end)
      })
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

      this.fetchResources(section).then(() => {
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
