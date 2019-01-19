<template>
  <div class="fretboard">
    <div
      v-for="(string, i) in strings"
      :key="string"
      class="string"
    >
      <div
        v-for="(note, fret) in stringsNotes[i]"
        :key="fret"
        class="fret"
        :style="{ backgroundColor: Colors[note.octave] }"
      >
        <label v-drag-sound="{start: e => initDrag(e, note.name, note.octave)}">
          {{ note.name }}<sub>{{ note.octave }}</sub>
        </label>
        <template v-if="note.flatName">
          <span>/</span>
          <label v-drag-sound="{start: e => initDrag(e, note.flatName, note.octave)}">
            {{ note.flatName }}<sub>{{ note.octave }}</sub>
          </label>
        </template>
      </div>
      <div class="fret ghost">x</div>
    </div>
  </div>
</template>

<script>
import { Note } from 'tonal'
import { StringRoots } from './constants'
import { Colors } from '../colors'
import SoundLabel from './BassLabel'
import '../directives/drag-sound'


export default {
  components: { SoundLabel },
  props: {
    instrument: Object,
    frets: {
      type: Number,
      default: 24
    }
  },
  data: () => ({
  }),
  computed: {
    strings () {
      return this.instrument.strings.split('')
    },
    stringsNotes () {
      return this.strings.map(string => this.stringNotes(StringRoots[string]))
    }
  },
  created () {
    this.Colors = Colors
  },
  methods: {
    stringNotes (root) {
      const notes = []
      const startCode = Note.midi(root)
      for (let i = 0; i <= this.frets; i++) {
        const note = Note.props(Note.fromMidi(startCode + i))
        const item = {
          fret: i,
          octave: note.oct,
          name: note.pc
        }
        const enharmonic = Note.enharmonic(item.name)
        if (enharmonic !== item.name) {
          item.flatName = item.name.replace('b', '♭')
          item.name = enharmonic.replace('#', '♯')
        }
        notes.push(item)
      }
      return notes
    },
    fretSound (note, octave) {
      console.log('#fretSound')
      return {
        style: 'finger',
        volume: 0.75,
        note: {
          type: 'regular',
          name: note,
          octave: octave,
          length: 8,
          dotted: false
        }
      }
    },
    initDrag (e, note, octave) {
      const sound = this.fretSound(note, octave)
      const style = {
        left: '-10px',
        top: (-e.target.offsetHeight / 2) + 'px'
      }
      return {
        data: [{
          sounds: [sound],
          offset: { x: 0, y: 0 }
        }],
        render (h) {
          return (
            <div class="fret-drag sound" style={style}>
              <SoundLabel sound={sound} display={'name'} />
            </div>
          )
        }
      }
    }
  }
}
</script>

<style lang="scss">
.fretboard {
  margin: 1em;
  display: flex;
  flex-direction: column-reverse;
  border: 2px solid #bbb;
  .string {
    display: flex;
    align-items: center;

    .fret {
      display: flex;
      justify-content: center;
      align-items: center;
      min-width: 4em;
      height: 2.5em;
      flex: 1;
      border: 1px solid #eee;
      border-width: 0 1px 1px 0;
      font-size: 0.875em;
      color: #222;
      user-select: none;

      &:first-child {
        font-weight: 500;
        max-width: 2.5em;
      }
      &.ghost {
        background-color: #ccc;
      }
      label {
        flex: 1;
        height: 100%;
        line-height: 2.5em;
        text-align: center;
      }
    }
    &:first-of-type { /* it's the last child because of reversed order */
      .fret {
        border-bottom: none;
      }
    }
  }
}
.drag.sound {
  position: fixed;
  top: -80px;
  width: 4em;
}
.fret-drag.sound {
  position: absolute;
  width: 4em;
}
</style>
