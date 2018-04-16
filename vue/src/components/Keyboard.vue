<template>
  <div class="keyboard">
    <div
      v-for="(note, i) in keys"
      :key="note.code"
      class="key"
      :class="{black: note.enharmonic, c: note.name === 'C'}"
      v-drag-sound="{start: e => initDrag(e, note)}">
      <span v-if="!note.enharmonic" v-text="note.name" />
    </div>
  </div>
</template>

<script>
// import { Note } from 'tonal'
import { SharpNotes, enharmonic } from '../core/note-utils'
import PianoNoteLabel from './PianoNoteLabel'
import '../directives/drag-sound'

export default {
  props: {
    instrument: Object
  },
  data: () => ({
  }),
  computed: {
    keys () {
      const [minOct, maxOct] = this.instrument.octaves
      const keys = []
      for (let o = minOct; o <= maxOct; o++) {
        const notes = SharpNotes.map(note => {
          return {
            name: note,
            code: note + o,
            octave: o,
            enharmonic: enharmonic(note)
          }
        })
        keys.push(...notes)
      }
      return keys.reverse()
    }
  },
  created () {
  },
  methods: {
    keySound (note) {
      return {
        volume: 0.75,
        note: {
          type: 'regular',
          name: note.name,
          octave: note.octave,
          length: 8,
          dotted: false
        },
        string: note.name + note.octave
      }
    },
    initDrag (e, note) {
      const sound = this.keySound(note)
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
              <PianoNoteLabel sound={sound} />
            </div>
          )
        }
      }
    }
  }
}
</script>

<style lang="scss">
.keyboard {
  position: relative;
  border: 1px solid #bbb;
  background-color: #fff;
  z-index: 1;

  .key {
    height: 26.45px;
    width: 100%;
    border-bottom: 1px solid #ccc;
    box-sizing: content-box;
    text-align: right;
    color: #999;
    &:last-of-type {
      border: none;
    }
    &.black {
      position: absolute;
      margin-top: -8px;
      height: 16px;
      width: 65%;
      background-color: #444!important;
      border-top-right-radius: 3px;
      border-bottom-right-radius: 3px;
    }
    span {
      font-size: 0.813em;
      margin-right: 2px;
    }
  }
}
</style>
