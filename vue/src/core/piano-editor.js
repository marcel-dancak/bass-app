import SoundEditor from './sound-editor'
import { noteDetune } from './note-utils'

function transpose(sound, track, step) {
  const [minOct, maxOct] = track.octaves
  const transposedNote = noteDetune(sound.note, step)
  if (transposedNote && transposedNote.octave >= minOct && transposedNote.octave <= maxOct) {
    if (sound.next) {
      transpose(sound.beat.section.nextSound(sound), track, step)
    }
    sound.note.name = transposedNote.name
    sound.note.octave = transposedNote.octave
    sound.string = sound.note.name + sound.note.octave
  }
}

export default function PianoEditor (track) {
  const editor = SoundEditor(track)
  Object.assign(editor.keyHandlers, {
    ArrowUp (e) {
      if (editor.selection.length) {
        editor.selection.forEach(s => transpose(s, track, 1))
        e.preventDefault()
      }
    },
    ArrowDown (e) {
      if (editor.selection.length) {
        editor.selection.forEach(s => transpose(s, track, -1))
        e.preventDefault()
      }
    },
    '.' () {
      this.selection.filter(s => {
        if (!s.next) {
          s.note.staccato = !s.note.staccato
        }
      })
    }
  })

  return editor
}
