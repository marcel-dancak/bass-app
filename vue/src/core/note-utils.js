import { Note } from 'tonal'

export const SharpNotes = 'C C♯ D D♯ E F F♯ G G♯ A A♯ B'.split(' ')
export const FlatNotes = 'C D♭ D E♭ E F G♭ G A♭ A B♭ B'.split(' ')

export function asciNote (name) {
  return name.replace('♭', 'b').replace('♯', '#')
}

export function unicodeNote (name) {
  return name.replace('b', '♭').replace('#', '♯')
}

export function enharmonic (name) {
  if (name.includes('♯')) {
    return FlatNotes[SharpNotes.indexOf(name)]
  } else if (name.includes('♭')) {
    return SharpNotes[FlatNotes.indexOf(name)]
  }
}

export function parseNote (name) {
  const props = Note.props(asciNote(name))
  return {
    name: unicodeNote(props.pc),
    octave: props.oct
  }
}

const BassRootNotes = {
  C: Note.props('C3'),
  G: Note.props('G2'),
  D: Note.props('D2'),
  A: Note.props('A1'),
  E: Note.props('E1'),
  B: Note.props('B0')
}

export function bassFret (string, note) {
  const rootNote = BassRootNotes[string]
  const noteMidi = Note.midi(asciNote(note.name + note.octave))
  // console.log(string.midi, noteMidi)
  return noteMidi - rootNote.midi
}

export function noteProps (note) {
  return Note.props(asciNote(note.name + note.octave))
}

export function noteDetune (note, offset) {
  const props = noteProps(note)
  const newNote = Note.props(Note.fromMidi(props.midi + offset))
  return {
    name: unicodeNote(Note.enharmonic(newNote.pc)),
    octave: newNote.oct
  }
}
