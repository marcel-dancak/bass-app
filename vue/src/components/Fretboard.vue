<template>
  <div>
    <div ref="dragSound" class="drag sound">
      <div />
    </div>
    <div ref="dragElem" class="custom-drag sound" :style="dragStyle">
      <sound-label v-if="dragStyle" :sound="dragSound" :display="'name'" />
    </div>
    <div class="fretboard">
      <div
        v-for="(string, i) in instrument.strings"
        :key="string"
        class="string">
        <div
          v-for="(note, fret) in stringsNotes[i]"
          :key="fret"
          class="fret"
          :style="{ backgroundColor: Colors[note.octave] }">
          <label
            draggable="true"
            @dragstart="(e) => dragStart(e, note.name, note.octave)">
            {{ note.name }}<sub>{{ note.octave }}</sub>
          </label>
          <template v-if="note.flatName">
            <span>/</span>
            <label @mousedown="(e) => customDragStart(e, note.flatName, note.octave)">
              {{ note.flatName }}<sub>{{ note.octave }}</sub>
            </label>
<!--             <label
              draggable="true"
              @dragstart="(e) => dragStart(e, note.flatName, note.octave)">
              {{ note.flatName }}<sub>{{ note.octave }}</sub>
            </label> -->
          </template>
        </div>
        <div class="fret ghost">x</div>
      </div>
    </div>
  </div>
</template>

<script>
import Vue from 'vue'
import { Note } from 'tonal'
import { StringRoots } from './constants'
import { Colors } from '../colors'
import SoundLabel from './BassLabel'

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
    dragSound: null,
    dragStyle: null
  }),
  computed: {
    stringsNotes () {
      const strings = this.instrument.strings
      return strings.map(string => this.stringNotes(StringRoots[string]))
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
    dragStart (evt, note, octave) {
      const dragSound = {
        style: 'finger',
        note: {
          type: 'regular',
          name: note,
          octave: octave
        }
      }
      new Vue({
        el: this.$refs.dragSound.children[0],
        render () {
          return <SoundLabel sound={dragSound} display={'name'} />
        },
        mounted () {
          this.$destroy()
        }
      })
      console.log(JSON.stringify({sound: dragSound, source: 'fretboard'}))
      // evt.dataTransfer.setData('text', JSON.stringify({sound: dragSound, source: 'fretboard'}))
      evt.dataTransfer.setData(JSON.stringify({sound: dragSound, source: 'fretboard'}), 'x')
      evt.dataTransfer.setData('text/html', 'data')
      evt.dataTransfer.setDragImage(this.$refs.dragSound, 10, evt.target.offsetHeight / 2)
    },
    customDragStart (evt, note, octave) {
      console.log(evt)
      this.dragSound = {
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
      document.addEventListener('mousemove', this.emitDragOver)
      document.addEventListener('mouseup', this.dragEnd, {once: true})
    },
    emitDragEvent (evt, type) {
      const detail = {
        sound: this.dragSound,
        evt: evt
      }
      const event = new CustomEvent(type, { detail })
      evt.target.dispatchEvent(event)
    },
    emitDragOver (evt) {
      // console.log('emulateDrag', e.target)
      this.dragStyle = {
        left: (evt.clientX - 8) + 'px',
        top: (evt.clientY - 16) + 'px'
      }
      // this.$refs.dragElem.style.left = this.dragStyle.left
      // this.$refs.dragElem.style.top = this.dragStyle.top

      if (this.lastTarget !== evt.target) {
        console.log('DragEnter/Leave')
        if (this.lastTarget) {
          const event = new CustomEvent('dragleave')
          this.lastTarget.dispatchEvent(event)
        }
      }
      this.emitDragEvent(evt, 'dragover')
      this.lastTarget = evt.target
    },
    emitDragEnter (evt) {
      console.log('emitDragEnter', evt.target)
    },
    dragEnd (evt) {
      console.log('dragEnd')
      document.removeEventListener('mousemove', this.emitDragOver)
      this.emitDragEvent(evt, 'drop')
      this.dragSound = null
      this.dragStyle = null
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
.custom-drag.sound {
  position: fixed;
  pointer-events: none;
  opacity: 0.75;
  width: 4em;
}
</style>
