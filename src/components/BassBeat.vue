<template>
  <div class="bass-beat">
    <div>
      <div
        v-for="string in strings"
        :key="string"
        class="string"
        @dragover="dragOver($event, string)"
        @dragleave="dragLeave"
        @drop="onDrop($event, string)">
<!--         <svg width="100%" height="100%" class="grid">
          <svg
            v-for="i in beat.subdivision"
            :key="i"
            :x="`${50/beat.subdivision + (i - 1) * (100 / beat.subdivision)}%`"
          >
            <bass-cell/>
          </svg>
        </svg> -->
      </div>
    </div>
    <template v-for="(sound, i) in beat.data">
      <sound-top-label :key="'l'+i" :sound="sound" />
      <div
        :key="sound.id"
        ref="sound"
        v-bind-el="sound"
        class="sound"
        :class="{
          selected: $editor.selection.includes(sound),
          dragged: !$editor.dragCopy && $editor.draggedSounds.includes(sound)
        }"
        :style="{
          left: (sound.start * 100) + '%',
          top: stringsPositions[sound.string],
          width: 100 * (sound.end - sound.start) + '%'
        }"
        @click="$editor.select($event, sound)"
        @contextmenu="$emit('contextmenu', $event, sound)"
        @auxclick="$emit('contextmenu', $event, sound)"
        @dblclick="$emit('contextmenu', $event, sound)"
        v-drag-sound="{
          start: (e) => initDrag(e, sound),
          end: () => $editor.draggedSounds = []
        }">
        <sound-label :sound="sound" :display="display" />
        <sound-resize v-if="sound.note.type !== 'ghost'" :sound="sound" :editor="$editor" />
      </div>
    </template>
    <div
      v-for="(drop, index) in dropItems"
      :key="index"
      :style="drop.style"
      class="drop-area"
    />
  </div>
</template>

<script>
import Vue from 'vue'
import { bassFret } from '../core/note-utils'
import SoundLabel from './BassLabel'
import SoundTopLabel from './SoundTopLabel'
import SoundResize from './SoundResize'
import BassCell from './BassCell'
import '../directives/drag-sound'


export default {
  name: 'bass-beat',
  components: { SoundLabel, SoundTopLabel, SoundResize, BassCell },
  props: ['beat', 'instrument', 'display'],
  data: () => ({
    dropItems: []
  }),
  computed: {
    $editor () {
      return this.$service('editor', ['selection', 'draggedSounds', 'dragCopy'])
    },
    strings () {
      return this.instrument.strings.split('').reverse()
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
      // const subbeat = parseInt(evt.offsetX / cell) // doesn't work in FF
      const subbeat = parseInt((evt.clientX - this.$el.getBoundingClientRect().left) / cell)
      const start = subbeat / grid
      return {
        start,
        subbeat
      }
    },
    dragOver (evt, string) {
      if (!evt.dataTransfer.data) {
        return
      }
      this.$editor.dragCopy = evt.ctrlKey
      const channel = evt.dataTransfer.channel
      const position = this.subbeatCell(evt)
      const key = [string, this.beat.bar, this.beat.beat, position.subbeat].join(':')
      // console.log('over', evt.target, key)
      let record = this.dropItems.find(i => i.id === channel)
      if (!record) {
        record = { id: channel, key }
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
        if (sound.note.type !== 'ghost') {
          const fret = bassFret(string, sound.note)
          valid = valid && fret >= 0 && fret < 25
          const duration = this.beat.section.noteDuration(this.beat, sound.note)
          width += (100 * duration)
        } else {
          width = 25
        }
      })
      this.$set(record, 'style', {
        left: (100 * position.start) + '%',
        top: this.stringsPositions[string],
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
    addSounds (sounds, string, position) {
      let prevSound = null
      sounds.forEach((sound, i) => {
        sound.string = string
        sound.start = position.start
        if (sound.note.type !== 'ghost') {
          sound.note.fret = bassFret(sound.string, sound.note)
        }
        position.beat.section.addSound(position.beat, sound)
        position = position.beat.section.nextSoundPosition(sound)
        if (prevSound) {
          prevSound.next = true
          sound.prev = true
        }
        prevSound = sound
      })
    },
    onDrop (evt, string) {
      const record = this.dropItems.find(i => i.id === evt.dataTransfer.channel)
      if (record && record.dropInfo.valid) {
        const copy = evt.ctrlKey
        let sounds = evt.dataTransfer.data

        if (copy) {
          sounds = JSON.parse(JSON.stringify(sounds))
        } else if (sounds[0].beat) {
          sounds[0].beat.section.deleteSound(sounds[0])
        }
        this.addSounds(sounds, string, { beat: this.beat, start: record.dropInfo.position.start })
        this.$editor.selection.push(...sounds)
      }
      // this.dropItems = []
      if (record) {
        this.dropItems.splice(this.dropItems.indexOf(record), 1)
      }
    },
    initDrag (evt, clickSound) {
      if (!this.$editor.selection.includes(clickSound)) {
        this.$editor.selection = [clickSound]
      }

      const roots = []
      this.$editor.selection.forEach(s => {
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
      this.$editor.selection = [] // clear selection before drop
      this.$editor.draggedSounds = draggedSounds
      const display = this.display
      return {
        data: groups,
        render (h) {
          let children = []
          groups.forEach(group => {
            group.sounds.forEach((sound, i) => {
              const bounds = sound.elem.getBoundingClientRect()
              const style = {
                position: 'absolute',
                width: (2 + sound.elem.offsetWidth) + 'px',
                left: (bounds.left - evt.clientX) + 'px',
                top: (bounds.top - evt.clientY) + 'px'
              }
              children.push(
                <div class="sound" style={style}>
                  <SoundLabel sound={sound} display={display} />
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
.swiper-content:not(:hover) {
  .bass-beat .grid {
    opacity: 0.0;
  }
}
.bass-beat {
  position: relative;
  margin-top: 1.75em;
  margin-bottom: 0.25em;
  .string {
    height: 2.25em;
    position: relative;
    &:before {
      content: "";
      position: absolute;
      pointer-events: none;
      height: 1px;
      width: 100%;
      top: 50%;
      left: 0;
      background-color: #e2e2e2;
    }
  }
  .grid {
    position: relative;
    pointer-events: none;
    transition: opacity 0.25s ease;
    will-change: opacity;
    svg {
      overflow: visible;
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
    &.dragged {
      background-color: #fff;
      pointer-events: none;
      > .label {
        opacity: 0.15;
      }
    }
  }
}
.drop-area {
  position: absolute;
  border-radius: 4px;
  border: 2px solid #2196F3;
  box-sizing: border-box;
  pointer-events: none;
  z-index: 250;
}
</style>
