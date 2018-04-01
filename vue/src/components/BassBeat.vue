<template>
  <div class="bass-beat">
    <div>
      <div
        v-for="string in strings"
        :key="string"
        class="string"
        @dragover="e => dragOver(e, string)"
        @dragleave="e => { dropStyle = dropInfo = null }"
        @drop="e => onDrop(e, string)">
      </div>
    </div>
    <template v-for="(sound, i) in beat.data">
      <sound-top-label :key="i" :sound="sound" />
      <div
        :key="i"
        ref="sound"
        class="sound"
        :class="{selected: editor.selection.includes(sound)}"
        :style="{
          left: (sound.start * 100) + '%',
          top: stringsPositions[sound.string],
          width: 100 * (sound.end - sound.start) + '%'
        }"
        click="e => $emit('soundClick', e, sound)"
        @mousedown="e => editor.select(e, sound)"
        @contextmenu="(e) => $emit('contextmenu', e, sound)">
        <sound-label :sound="sound" :display="display" />
        <sound-resize :sound="sound" :editor="editor" />
      </div>
    </template>
    <div class="drop-area" v-if="dropStyle" :style="dropStyle" />
  </div>
</template>

<script>
import Vue from 'vue'
import { bassFret } from '../core/note-utils'
import SoundLabel from './BassLabel'
import SoundTopLabel from './SoundTopLabel'
import SoundResize from './SoundResize'

export default {
  name: 'bass-beat',
  components: { SoundLabel, SoundTopLabel, SoundResize },
  props: ['editor', 'beat', 'instrument', 'display'],
  data: () => ({
    dropStyle: null
  }),
  computed: {
    strings () {
      return [].concat(this.instrument.strings).reverse()
    },
    stringsPositions () {
      const positions = {}
      this.strings.forEach((s, i) => {
        // const note = Note.props(s)
        // positions[note.letter] = (100 * i / this.strings.length) + '%'
        positions[s] = (100 * i / this.strings.length) + '%'
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
      const subbeat = parseInt(evt.offsetX / cell) // doesn't work in FF
      // const subbeat = parseInt((evt.clientX - evt.target.getBoundingClientRect().left) / cell);
      const start = subbeat / grid
      return {
        start,
        subbeat
      }
    },
    dragOver (evt, string) {
      const position = this.subbeatCell(evt.detail.evt)
      const key = [string, this.beat.bar, this.beat.beat, position.subbeat].join(':')
      if (!this.dropInfo || this.dropInfo.key !== key) {
        console.log(key, performance.now())
        const fret = bassFret(string, evt.detail.sound.note)
        const valid = fret >= 0 && fret < 25
        this.dropStyle = {
          left: (100 * position.start) + '%',
          top: this.stringsPositions[string],
          width: '100px',
          height: evt.target.offsetHeight + 'px',
          borderColor: valid ? '#2196F3' : '#f44336'
        }
        this.dropInfo = {
          key,
          valid,
          fret,
          position
        }
      }
    },
    onDrop (evt, string) {
      if (this.dropInfo.valid) {
        const sound = evt.detail.sound
        sound.string = string
        sound.start = this.dropInfo.position.start
        sound.note.fret = this.dropInfo.fret
        this.beat.section.addSound(this.beat, sound)
        console.log(sound)
      }
      this.dropStyle = this.dropInfo = null
    }
  }
}
</script>

<style lang="scss">
.instrument.bass {
  position: relative;
  .string {
    height: 2.25em;
    position: relative;
    &:before {
      content: "";
      position: absolute;
      height: 1px;
      width: 100%;
      top: 50%;
      left: 0;
      background-color: #e2e2e2;
    }
  }
  .sound {
    position: absolute;
    top: 0;
    height: 2.25em;
    line-height: 2.25em;
    z-index: 100;
    color: #222;

    .label {
      padding: 1px;
    }
    &.selected {
      z-index: 200;
      .label {
        border: 2px solid #333;
        padding: 0;
      }
    }
  }
}
.drop-area {
  position: absolute;
  border-radius: 4px;
  border: 2px solid #2196F3;
  pointer-events: none;
  z-index: 100;
}
</style>
