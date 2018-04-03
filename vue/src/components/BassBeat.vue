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
      <sound-top-label :key="'l'+i" :sound="sound" />
      <div
        :key="sound.id"
        ref="sound"
        class="sound"
        :class="{selected: editor.selection.includes(sound)}"
        :style="{
          left: (sound.start * 100) + '%',
          top: stringsPositions[sound.string],
          width: 100 * (sound.end - sound.start) + '%'
        }"
        @click="e => editor.select(e, sound)"
        @contextmenu="(e) => $emit('contextmenu', e, sound)"
        v-drag-sound="() => initDrag(sound)">
        <sound-label :sound="sound" :display="display" />
        <sound-resize :sound="sound" :editor="editor" />
        <!-- <span style="position:absolute">{{ sound.id }}</span> -->
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
import '../directives/drag-sound'

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
    soundElem (sound) {
      const index = this.beat.data.indexOf(sound)
      return this.$refs.sound[index]
    },
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
      const position = this.subbeatCell(evt)
      const key = [string, this.beat.bar, this.beat.beat, position.subbeat].join(':')
      if (!this.dropInfo || this.dropInfo.key !== key) {
        const sound = evt.dataTransfer.sound

        let width
        let valid = true
        if (sound.note.type !== 'ghost') {
          const fret = bassFret(string, sound.note)
          valid = fret >= 0 && fret < 25
          // console.log(this.beat.section, evt.dataTransfer.sound.note)
          const duration = this.beat.section.noteDuration(this.beat, evt.dataTransfer.sound.note)
          width = (100 * duration) + '%'
        } else {
          width = '25%'
        }

        this.dropStyle = {
          left: (100 * position.start) + '%',
          top: this.stringsPositions[string],
          width: width,
          height: evt.target.offsetHeight + 'px',
          borderColor: valid ? '#2196F3' : '#f44336'
        }
        this.dropInfo = {
          key,
          valid,
          position
        }
      }
    },
    onDrop (evt, string) {
      if (this.dropInfo && this.dropInfo.valid) {
        const copy = evt.ctrlKey
        let sound = evt.dataTransfer.sound
        if (copy) {
          sound = JSON.parse(JSON.stringify(sound))
        } else if (sound.beat) {
          this.beat.section.deleteSound(sound)
        }

        sound.string = string
        sound.start = this.dropInfo.position.start
        if (sound.note.type !== 'ghost') {
          sound.note.fret = bassFret(string, sound.note)
        }
        this.beat.section.addSound(this.beat, sound)
      }
      this.dropStyle = this.dropInfo = null
    },
    initDrag (sound) {
      if (!this.editor.selection.includes(sound)) {
        this.editor.selection = [sound]
      }
      // sound = this.editor.selection[0]
      const display = this.display
      const soundEl = this.soundElem(sound)
      const style = {width: soundEl.offsetWidth + 'px'}
      return {
        data: sound,
        render (h) {
          return <div style={style} class="sound"><SoundLabel sound={sound} display={display} /></div>
        }
      }
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
