<template>
  <div
    class="piano-beat"
    :style="{minHeight: (keys.length * 1) + 'em'}">
    <div>
      <div
        v-for="note in keys"
        :key="note.code"
        class="key"
        :class="{black: note.enharmonic, c: note.name === 'C'}"
        @dragover="e => dragOver(e, note)"
        @dragleave="dragLeave"
        @drop="e => onDrop(e, note)">
      </div>
    </div>
    <template v-for="(sound, i) in beat.data">
      <div
        :key="sound.id"
        ref="sound"
        v-bind-el="sound"
        class="sound piano"
        :class="{
          selected: editor.selection.includes(sound),
          dragged: !editor.dragCopy && editor.draggedSounds.includes(sound)
        }"
        :style="{
          left: (sound.start * 100) + '%',
          top: gridPosition[sound.string],
          width: 100 * (sound.end - sound.start) + '%'
        }"
        @click="e => editor.select(e, sound)"
        v-drag-sound="{
          start: (e) => initDrag(e, sound),
          end: () => editor.draggedSounds = []
        }">
        <piano-note-label :sound="sound" />
        <sound-resize :sound="sound" :editor="editor" />
      </div>
    </template>
    <div
      v-for="drop in dropItems"
      class="drop-area"
      :style="drop.style"
    />
  </div>
</template>

<script>
import Vue from 'vue'
import { Note } from 'tonal'
import { asciNote, unicodeNote, SharpNotes, enharmonic } from '../core/note-utils'
import PianoNoteLabel from './PianoNoteLabel'
import SoundResize from './SoundResize'
import '../directives/drag-sound'



export default {
  name: 'bass-beat',
  components: { PianoNoteLabel, SoundResize },
  props: ['editor', 'beat', 'instrument'],
  data: () => ({
    dropItems: []
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
    },
    gridPosition () {
      const positions = {}
      this.keys.forEach((key, i) => {
        const pos = (100 * i / this.keys.length) + '%'
        positions[key.code] = pos
        if (key.enharmonic) {
          positions[key.enharmonic + key.octave] = pos
        }
      })
      return positions
    }
  },
  watch: {
    'beat.data': {
      immediate: true,
      handler (sounds) {
        sounds.forEach(sound => {
          Vue.util.defineReactive(sound, 'end')
        })
      }
    }
  },
  methods: {
    subbeatCell (evt) {
      const grid = this.beat.subdivision
      const cell = evt.target.offsetWidth / grid
      // const subbeat = parseInt(evt.offsetX / cell) // doesn't work in FF
      const subbeat = parseInt((evt.clientX - this.$el.getBoundingClientRect().left) / cell)
      const start = subbeat / grid
      return {
        start,
        subbeat
      }
    },
    dragOver (evt, note) {
      this.editor.dragCopy = evt.ctrlKey
      const channel = evt.dataTransfer.channel
      const position = this.subbeatCell(evt)
      const key = [note.code, this.beat.bar, this.beat.beat, position.subbeat].join(':')
      // console.log('over', evt.target, key)
      let record = this.dropItems.find(i => i.id === channel)
      if (!record) {
        record = {id: channel, key}
        this.dropItems.push(record)
      } else if (record.key === key) {
        // console.log('cached', key)
        return
      }
      // console.log('ON DROP', key)
      let sounds = evt.dataTransfer.data

      if (!Array.isArray(sounds)) {
        sounds = [sounds]
      }
      let width = 0
      let valid = true
      sounds.forEach(sound => {
        const duration = this.beat.section.noteDuration(this.beat, sound.note)
        width += (100 * duration)
      })
      this.$set(record, 'style', {
        left: (100 * position.start) + '%',
        top: this.gridPosition[note.code],
        width: width + '%',
        height: evt.target.offsetHeight + 'px',
        borderColor: valid ? '#2196F3' : '#f44336'
      })
      record.key = key
      record.dropInfo = {
        key,
        valid,
        position
      }
    },
    dragLeave (e) {
      const index = this.dropItems.findIndex(i => i.id === e.channel)
      this.dropItems.splice(index, 1)
    },
    addSounds (sounds, note, position) {
      let prevSound = null
      sounds.forEach((sound, i) => {
        sound.note.name = note.name
        sound.note.octave = note.octave
        sound.string = note.name + note.octave
        sound.start = position.start
        position.beat.section.addSound(position.beat, sound)
        position = position.beat.section.nextSoundPosition(sound)
        if (prevSound) {
          prevSound.next = true
          sound.prev = true
        }
        prevSound = sound
      })
    },
    onDrop (evt, note) {
      const record = this.dropItems.find(i => i.id === evt.dataTransfer.channel)
      if (record && record.dropInfo.valid) {
        const copy = evt.ctrlKey
        let sounds = evt.dataTransfer.data

        if (copy) {
          sounds = JSON.parse(JSON.stringify(sounds))
        } else if (sounds[0].beat) {
          sounds[0].beat.section.deleteSound(sounds[0])
        }
        this.addSounds(sounds, note, {beat: this.beat, start: record.dropInfo.position.start})
      }
      // this.dropItems = []
      if (record) {
        this.dropItems.splice(this.dropItems.indexOf(record), 1)
      }
    },
    initDrag (evt, clickSound) {
      if (!this.editor.selection.includes(clickSound)) {
        this.editor.selection = [clickSound]
      }
      const roots = []
      this.editor.selection.forEach(s => {
        const rootSound = this.beat.section.rootSoundOf(s)
        if (!roots.includes(rootSound)) {
          roots.push(rootSound)
        }
      })
      const draggedSounds = []
      const groups = roots.map(s => {
        const bounds = s.elem.getBoundingClientRect()
        const sounds = [s].concat(this.beat.section.nextSounds(s))
        draggedSounds.push(...sounds)
        return {
          sounds,
          offset: {
            // left edge + 10px
            x: bounds.left + 10 - evt.clientX,
            // center of source element
            y: (bounds.top + bounds.height / 2) - evt.clientY
          }
        }
      })
      this.editor.draggedSounds = draggedSounds
      return {
        data: groups,
        render (h) {
          let children = []
          groups.forEach(group => {
            group.sounds.forEach((sound, i) => {
              const bounds = sound.elem.getBoundingClientRect()
              const style = {
                position: 'absolute',
                width: sound.elem.offsetWidth + 'px',
                // height: sound.elem.offsetHeight + 'px',
                left: (bounds.left - evt.clientX) + 'px',
                top: (bounds.top - evt.clientY) + 'px'
              }
              children.push(
                <div class="sound" style={style}>
                  <PianoNoteLabel sound={sound} />
                </div>
              )
            })
          })
          return <div style="position: relative">{ children }</div>
        }
      }
    }
  }
}
</script>

<style lang="scss">
.piano-beat {
  position: relative;
  border-top: 1px solid #aaa;
  .key {
    height: 16px;
    &.black {
      background-color: #f0f0f0!important;
    }
    &.c {
      border-bottom: 1px solid #aaa;
    }
  }
  .sound {
    position: absolute;
    top: 0;
    z-index: 100;
    color: #222;

    &.selected {
      z-index: 200;
      .label {
        border: 2px solid #333;
        padding: 0;
      }
    }
    &.dragged {
      background-color: #fff;
      pointer-events: none;
      > .label {
        opacity: 0.15;
      }
    }

    .resize-container {
      .handler {
        font-size: 0.65em;
        flex-direction: row;
        align-items: center;
        margin-right: 1px;
        > span {
          width: 7px;
        }
      }
    }
  }
}
</style>
