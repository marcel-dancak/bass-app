const shiftLeft = sound => {
  if (sound.prev) {
    return
  }
  const trackSection = sound.beat.section
  let startTime
  if (sound.start > 0) {
    startTime = sound.start - 1 / sound.beat.subdivision
  } else {
    const prevBeat = trackSection.prevBeat(sound.beat)
    startTime = -1 / prevBeat.subdivision
  }
  trackSection.setSoundStart(sound, startTime)
}

const shiftRight = sound => {
  if (sound.prev) {
    return
  }
  const step = 1 / sound.beat.subdivision
  sound.beat.section.setSoundStart(sound, sound.start + step)
}

export default function SoundEditor () {
  return {
    selection: [],
    dragCopy: false,
    draggedSounds: [],
    keyHandlers: {
      d () {
        console.log(this.selection[0])
      },
      ArrowLeft () {
        this.selection.forEach(shiftLeft)
      },
      ArrowRight () {
        this.selection.forEach(shiftRight)
      },
      Delete () {
        this.selection.forEach(s => s.beat.section.deleteSound(s))
        this.selection = []
      }
    },
    select (e, sound) {
      if (e.ctrlKey) {
        const index = this.selection.indexOf(sound)
        if (index === -1) {
          this.selection.push(sound)
        } else {
          this.selection.splice(index, 1)
        }
      } else {
        this.selection = [sound]
      }
    },
    resizeSound (sound, length, dotted) {
      const trackSection = sound.beat.section // probably should be initialized with
      const dependencies = trackSection.nextSounds(sound)

      sound.note.length = length
      sound.note.dotted = dotted

      const duration = trackSection.soundDuration(sound)
      sound.end = sound.start + duration

      let prevSound = sound
      dependencies.forEach(depSound => {
        const position = trackSection.nextSoundPosition(prevSound)
        depSound.start = position.start
        if (position.beat !== depSound.beat) {
          // console.log('moving to '+position.beat.beat+ ' at: '+position.start);
          depSound.beat.data.splice(depSound.beat.data.indexOf(depSound), 1)
          trackSection.addSound(position.beat, depSound)
        } else {
          // console.log('moving to position '+position.start)
          depSound.end = depSound.start + trackSection.soundDuration(depSound)
        }
        prevSound = depSound
      })
    },
    keyDown (evt) {
      const action = this.keyHandlers[evt.key]
      if (action) {
        action.bind(this)(evt)
      }
    }
  }
}
