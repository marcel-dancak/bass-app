import bufferLoader from './buffer-loader'

export const DrumKit = [
  {
    name: 'tom1',
    label: 'Small Rack Tom',
    filename: 'drums/acoustic/small-rack-tom'
  }, {
    name: 'tom2',
    label: 'Big Rack Tom',
    filename: 'drums/acoustic/big-rack-tom'
  }, {
    name: 'tom3',
    label: 'Floor Tom',
    filename: 'drums/acoustic/floor-tom'
  }, {
    name: 'crash',
    label: 'Crash',
    filename: 'drums/acoustic/crash'
  }, {
    name: 'hihat-open',
    label: 'Hi-Hat Open',
    filename: 'drums/acoustic/hi-hat-open'
  }, {
    name: 'hihat',
    label: 'Hi-Hat Closed',
    filename: 'drums/acoustic/hi-hat-closed'
  }, {
    name: 'snare',
    label: 'Snare',
    filename: 'drums/acoustic/snare'
  }, {
    name: 'kick',
    label: 'Kick',
    filename: 'drums/acoustic/kick'
  }
]

export const PercussionKit = [
  {
    name: 'clap',
    label: 'Clap',
    filename: 'percussion/clap_009'
  }, {
    name: 'tambourine',
    label: 'Tambourine',
    filename: 'percussion/tambourine_001'
  }, {
    name: 'maracas',
    label: 'Maracas',
    filename: 'percussion/shaker_009'
  }, {
    name: 'cabasa',
    label: 'Cabasa',
    filename: 'percussion/shaker_002'
  }, {
    name: 'cowbell',
    label: 'Cowbell',
    filename: 'percussion/cowbell'
  }, {
    name: 'claves',
    label: 'Claves',
    filename: 'percussion/claves'
  }, {
    name: 'bongo',
    label: 'Bongo',
    filename: 'percussion/bongo_005a'
  }, /*{
    name: 'djembe',
    label: 'Djembe',
    filename: 'percussion/bongo_005d'
  }, */{
    name: 'conga',
    label: 'Conga',
    filename: 'percussion/bongo_002c'
  }/*, {
    name: 'cajon',
    label: 'Cajon',
    filename: 'percussion/bongo_002c'
  }*/
]

export function PercussionInstrument (config = DrumKit) {
  return {
    soundResources (sound) {
      return [config.find(drum => drum.name === sound.drum).filename]
    },

    playSound (output, sound, startTime, beatTime) {
      const resource = this.soundResources(sound)[0]
      const audioData = bufferLoader.loadResource(resource)
      if (audioData) {
        const source = output.context.createBufferSource()
        source.buffer = audioData
        const gain = output.context.createGain()
        gain.gain.value = sound.volume
        source.connect(gain)
        gain.connect(output)

        source.start(startTime)
      }
    }
  }
}
