const SharpNotes = 'C C♯ D D♯ E F F♯ G G♯ A A♯ B'.split(' ')
const FlatNotes = 'C D♭ D E♭ E F G♭ G A♭ A B♭ B'.split(' ')

function detune (note, offset) {
  const scale = note.name.indexOf('♭') !== -1 ? FlatNotes : SharpNotes
  let index = scale.indexOf(note.name)
  index += offset
  while (index < 0) {
    index += 12
    note.octave--
  }
  while (index > 11) {
    index -= 12
    note.octave++
  }
  note.fret += offset
  note.name = scale[index]
}

  // Math.random should be unique because of its seeding algorithm.
  // Convert it to base 36 (numbers + letters), and grab the first 9 characters
  // after the decimal.
const randomId = () => Math.random().toString(36).substr(2, 7)

const floatsEqual = (a, b) => (Math.abs(a - b) <= 0.01)

export class BaseTrackSection {
  constructor (section, data) {
    this.section = section
    this.data = data
    if (!data) {
      throw new Error()
    }
    this.data.forEach(beat => {
      beat.section = this
      beat.data.forEach(sound => {
        Object.defineProperty(sound, 'beat', {value: beat, writable: true})

        if (sound.hasOwnProperty('subbeat')) {
          sound.start = (sound.subbeat - 1) / beat.subdivision
        }
        // old bass model
        if (sound.hasOwnProperty('sound')) {
          sound.volume = sound.sound.volume
          sound.note = sound.sound.note
          if (sound.sound.noteLength) {
            sound.note.length = sound.sound.noteLength.length
            sound.note.dotted = sound.sound.noteLength.dotted
            sound.note.staccato = sound.sound.noteLength.staccato
          }
          sound.style = sound.sound.style
          sound.string = sound.sound.string
          sound.prev = sound.sound.prev ? true : undefined
          sound.next = sound.sound.next ? true : undefined
          delete sound.sound
          delete sound.subbeat
          delete sound.note.code
        }
        if (sound.note) {
          // convert old slide format
          if (sound.note.slide && sound.note.slide.endNote) {
            sound.endNote = sound.note.slide.endNote
            delete sound.note.slide.endNote
          }
          // convert old grace format
          if (sound.note.type === 'grace' && !sound.endNote) {
            sound.endNote = {
              name: sound.note.name,
              octave: sound.note.octave,
              fret: sound.note.fret
            }
            detune(sound.note, -2)
          }
          if (sound.note.type === 'ghost' && !sound.note.length) {
            sound.note.length = 16
          }
        }
        this.initializeSound(sound)
      })
    })

    const beats = []
    this.forEachBeat(beat => { beats.push(beat) })
    this.beats = beats
  }

  initializeSound (sound) {
    sound.id = randomId()
  }

  beat (bar, beat) {
    // var flatIndex = (bar-1)*this.timeSignature.top + beat-1;
    // return this.data[flatIndex];
    for (var i = 0; i < this.data.length; i++) {
      var beatData = this.data[i]
      if (beatData.bar === bar && beatData.beat === beat) {
        return beatData
      }
    }
    beat = {
      bar: bar,
      beat: beat,
      section: this,
      subdivision: 4,
      meta: {},
      data: []
    }
    this.data.push(beat)
    return beat
  }

  prevBeat (beat) {
    var barIndex = beat.bar
    var beatIndex = beat.beat - 1
    if (beatIndex === 0) {
      beatIndex = this.section.timeSignature.top
      barIndex--
    }
    if (barIndex > 0) {
      return this.beat(barIndex, beatIndex)
    }
  }

  nextBeat (beat) {
    var barIndex = beat.bar
    var beatIndex = beat.beat + 1

    if (beatIndex > this.section.timeSignature.top) {
      beatIndex = 1
      barIndex++
    }
    if (barIndex <= this.section.length) {
      return this.beat(barIndex, beatIndex)
    }
  }

  sound (beat, filter) {
    for (let i = 0; i < beat.data.length; i++) {
      const sound = beat.data[i]
      let match = true
      for (var key in filter) {
        if (sound[key] !== filter[key]) {
          match = false
          break
        }
      }
      if (match) {
        return sound
      }
    }
  }

  beatSounds (beat) {
    return beat.data
  }

  orderedBeatSounds (beat) {
    return beat.data.sort((a, b) => (a.start - b.start))
  }

  addSound (beat, sound) {
    Object.defineProperty(sound, 'beat', {value: beat, writable: true})
    delete sound.offset
    this.initializeSound(sound)
    beat.data.push(sound)
  }

  deleteSound (sound) {
    const index = sound.beat.data.indexOf(sound)
    if (index !== -1) {
      sound.beat.data.splice(index, 1)
    }
  }

  clearBeat (beat) {
    beat.data.splice(0, beat.data.length)
  }

  loadBeats (beats) {
    beats.forEach(beat => {
      const destBeat = this.beat(beat.bar, beat.beat)
      Array.prototype.push.apply(destBeat.data, beat.data)
      destBeat.data.forEach(sound => {
        Object.defineProperty(sound, 'beat', {value: destBeat, writable: true})
        this.initializeSound(sound)
      })
    })

    // fix references with prev and next beat
    const firstBeat = this.beat(beats[0].bar, beats[0].beat)
    firstBeat.data.forEach(sound => {
      if (sound.prev && sound.start === 0) {
        var prev = this.prevSound(sound)
        if (prev) {
          prev.next = true
        } else {
          sound.prev = false
        }
      }
    })
    let lastBeat = beats[beats.length - 1]
    lastBeat = this.beat(lastBeat.bar, lastBeat.beat)
    lastBeat.data.forEach(sound => {
      if (sound.next && sound.end === 1) {
        const next = this.nextSound(sound)
        if (next) {
          next.prev = true
        } else {
          sound.next = false
        }
      }
    })
  }

  forEachBeat (callback) {
    let barIndex, beatIndex
    for (barIndex = 1; barIndex <= this.section.length; barIndex++) {
      for (beatIndex = 1; beatIndex <= this.section.timeSignature.top; beatIndex++) {
        callback(this.beat(barIndex, beatIndex))
      }
    }
  }

  forEachSound (callback) {
    for (let i = 0; i < this.data.length; i++) {
      const beat = this.data[i]
      for (let j = 0; j < beat.data.length; j++) {
        const sound = beat.data[j]
        callback(sound)
      }
    }
  }

  rawBeatData (beat) {
    return beat
  }

  rawData () {
    return this.data
  }

  toJSON () {}
}


export class NotesTrackSection extends BaseTrackSection {
  soundDuration (sound) {
    if (sound && sound.note) {
      let duration = this.section.timeSignature.bottom / sound.note.length
      if (sound.note.dotted) {
        duration *= 1.5
      }
      if (sound.beat.subdivision === 3) {
        duration *= 2 / 3
      }
      return duration
    }
  }

  noteDuration (beat, note) {
    let duration = this.section.timeSignature.bottom / note.length
    if (note.dotted) {
      duration *= 1.5
    }
    if (beat.subdivision === 3) {
      duration *= 2 / 3
    }
    return duration
  }

  initializeSound (sound) {
    super.initializeSound(sound)
    if (sound.note && sound.note.length < 1) {
      sound.note.length = Math.round(1.0 / sound.note.length)
    }
    const end = sound.start + this.soundDuration(sound)
    // sound.end = end
    Object.defineProperty(sound, 'end', {value: end, writable: true, configurable: true, enumerable: false})
  }

  nextSoundPosition (sound) {
    var beatOffset = parseInt(sound.end)
    var start = sound.end - beatOffset

    var beat = sound.beat
    while (beatOffset) {
      beat = this.nextBeat(beat)
      beatOffset--
    }
    return {
      beat: beat,
      start: start
    }
  }

  nextSound (sound) {
    const position = this.nextSoundPosition(sound)
    if (!position.beat) return

    const start = position.start
    for (var i = 0; i < position.beat.data.length; i++) {
      var s = position.beat.data[i]
      if (s.string === sound.string && floatsEqual(s.start, start)) {
        return s
      }
    }
  }
  nextSounds (sound) {
    const sounds = []
    while (sound.next) {
      sound = this.nextSound(sound)
      sounds.push(sound)
    }
    return sounds
  }

  prevSound (sound) {
    const ts = this.section.timeSignature
    const sectionTime = (beat, value) => (beat.bar - 1) * ts.top + beat.beat + value

    const absEnd = sectionTime(sound.beat, sound.start)
    // console.log('looking for: '+absEnd+' at string '+sound.string)
    let beat = sound.beat
    while (beat) {
      for (let i = 0; i < beat.data.length; i++) {
        const s = beat.data[i]
        var stop = false
        if (s.string === sound.string) {
          const end = sectionTime(beat, s.end)
          if (floatsEqual(end, absEnd)) {
            return s
          }
          if (end < absEnd) {
            stop = true
          }
        }
      }
      if (stop) {
        return
      }
      beat = this.prevBeat(beat)
    }
  }

  rootSoundOf (sound) {
    while (sound.prev) {
      sound = this.prevSound(sound)
    }
    return sound
  }

  deleteSound (sound) {
    if (sound.prev) {
      // console.log('BREAK PREV SOUND CHAIN')
      var prevSound = this.prevSound(sound)
      if (prevSound) delete prevSound.next
    }
    if (sound.next) {
      var next = this.nextSound(sound)
      if (next) {
        delete next.prev
        this.deleteSound(next)
      }
    }
    super.deleteSound(sound)
  }

  clearBeat (beat) {
    while (beat.data.length) {
      this.deleteSound(beat.data[0])
    }
  }

  offsetSound (sound, offset) {
    sound.offset = parseFloat(((sound.offset || 0) + offset).toFixed(2))
    if (sound.offset === 0) delete sound.offset

    // sound.start = parseFloat((sound.start + offset ).toFixed(2));
    // collect chained sounds before applying offset (important)
    // var sounds = [sound];
    // while (sound.next) {
    //   sound = workspace.trackSection.nextSound(sound);
    //   sounds.push(sound);
    // }
    // sounds.forEach(function(s) {
    //   s.start = parseFloat((s.start + offset).toFixed(2));
    //   s.end = parseFloat((s.end + offset).toFixed(2));
    // });
  }

  setSoundStart (sound, start) {
    const tiedSounds = this.nextSounds(sound)

    if (start >= 0 && start < 1) {
      sound.start = start
      sound.end = sound.start + this.soundDuration(sound)
    } else {
      let destBeat
      if (start < 0) {
        destBeat = this.prevBeat(sound.beat)
        start += 1
      } else {
        destBeat = this.nextBeat(sound.beat)
        start -= 1
      }
      sound.beat.data.splice(sound.beat.data.indexOf(sound), 1)
      sound.start = start
      this.addSound(destBeat, sound)
    }

    let prevSound = sound
    tiedSounds.forEach(s => {
      var position = this.nextSoundPosition(prevSound)
      s.start = position.start
      if (position.beat !== s.beat) {
        s.beat.data.splice(s.beat.data.indexOf(s), 1)
        this.addSound(position.beat, s)
      } else {
        s.end = s.start + this.soundDuration(s)
      }
      prevSound = s
    })
  }
}

export function Section (params) {
  const tracks = {}

  const section = {
    bpm: params.bpm,
    timeSignature: params.timeSignature,
    length: params.length,
    tracks,
    // addBass (id, data) {
    //   const track = new NotesTrackSection(params, data)
    //   track.id = id
    //   tracks[id] = track
    //   return track
    // },
    // addDrum (id, data) {
    //   const track = new BaseTrackSection(params, data)
    //   track.id = id
    //   tracks[id] = track
    //   return track
    // }
    addTrack (id, data) {
      const type = id.split('_')[0]
      const TrackSection = {
        bass: NotesTrackSection,
        piano: NotesTrackSection,
        drums: BaseTrackSection
      }[type]
      const track = new TrackSection(params, data)
      track.id = id
      tracks[id] = track
      return track
    }
  }
  for (let id in params.tracks) {
    section.addTrack(id, params.tracks[id])
  }

  return section
}
