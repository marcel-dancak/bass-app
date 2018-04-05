function shiftLeft (sound) {
  if (sound.start > 0) {
    sound.start = sound.start - 1 / sound.beat.subdivision
  } else {
    const prevBeat = sound.beat.section.prevBeat(sound.beat)
    sound.beat.data.splice(sound.beat.data.indexOf(sound), 1)
    sound.start = 1 - (1 / prevBeat.subdivision)
    sound.beat.section.addSound(prevBeat, sound)
  }
}

function shiftRight (sound) {
  const step = 1 / sound.beat.subdivision
  sound.start += step
  if (sound.start >= 1) {
    sound.start -= 1
    sound.beat.data.splice(sound.beat.data.indexOf(sound), 1)
    sound.beat.section.addSound(sound.beat.section.nextBeat(sound.beat), sound)
  }
}

function shiftUp (sound) {
  const index = this.track.drums.findIndex(s => s.name === sound.drum) - 1
  if (index >= 0) {
    // sound.beat.section.deleteSound(sound)
    sound.drum = this.track.drums[index].name
    // sound.beat.section.addSound(sound.beat, sound)
  }
}

function shiftDown (sound) {
  const index = this.track.drums.findIndex(s => s.name === sound.drum) + 1
  if (index < this.track.drums.length) {
    sound.drum = this.track.drums[index].name
  }
}

const keyHandlers = {
  d () {
    console.log(this.selection[0])
  },
  ArrowLeft () {
    this.selection.forEach(shiftLeft)
  },
  ArrowRight () {
    this.selection.forEach(shiftRight)
  },
  ArrowUp () {
    this.selection.forEach(shiftUp.bind(this))
  },
  ArrowDown () {
    this.selection.forEach(shiftDown.bind(this))
  },
  Delete () {
    this.selection.forEach(s => s.beat.section.deleteSound(s))
    this.selection = []
  }
}

export default function DrumEditor (track) {
  return {
    track: track,
    selection: [],
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
    keyDown (evt) {
      const action = keyHandlers[evt.key]
      if (action) {
        action.bind(this)()
      }
    }
  }
}
