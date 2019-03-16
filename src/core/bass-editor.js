import SoundEditor from './sound-editor'
import { noteDetune } from './note-utils'

function detune (note, steps) {
  const detuned = noteDetune(note, steps)
  note.fret += steps
  note.name = detuned.name
  note.octave = detuned.octave
}

function transposeUp (sound) {
  if (sound.note.type !== 'ghost') {
    if (sound.style !== 'ring' && sound.note.fret < 24) {
      detune(sound.note, 1)
    }
    if (sound.endNote && sound.endNote.fret < 24) {
      detune(sound.endNote, 1)
    }
  }
}

function transposeDown (sound) {
  if (sound.note.type !== 'ghost') {
    if (sound.style !== 'ring' && sound.note.fret > 0) {
      detune(sound.note, -1)
    }
    if (sound.endNote && sound.endNote.fret > 0) {
      detune(sound.endNote, -1)
    }
  }
}


export default function BassEditor (track) {
  const editor = SoundEditor(track)
  Object.assign(editor, {
    transposeDown,
    transposeUp,
    setStyle (sound, style) {
      if (style === 'hammer' || style === 'pull' || style === 'ring') {
        const prevSound = sound.beat.section.prevSound(sound)
        if (!prevSound || prevSound.note.type === 'ghost') {
          return false
        }
        prevSound.next = true
        sound.prev = true
      } else {
        if (sound.prev) {
          console.log('disconnect sounds')
          sound.prev = false
          const prevSound = sound.beat.section.prevSound(sound)
          if (prevSound) {
            prevSound.next = false
          }
        }
      }
      sound.style = style
    }
  })
  Object.assign(editor.keyHandlers, {
    ArrowUp () {
      this.selection.forEach(transposeUp)
    },
    ArrowDown () {
      this.selection.forEach(transposeDown)
    },
    '.' () {
      this.selection.filter(s => {
        if (s.note.type !== 'ghost' && !s.next) {
          s.note.staccato = !s.note.staccato
        }
      })
    },
    h () {
      this.selection.forEach(sound => {
        editor.setStyle(sound, 'hammer')
      })
    },
    p () {
      this.selection.forEach(sound => {
        editor.setStyle(sound, 'pull')
      })
    }
  })
  return editor
}
