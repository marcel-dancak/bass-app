<template>
  <div class="mt-2">
    <v-layout class="fretboard-labels">
      <label/>
      <label v-for="(label, index) in visibleLabels" :key="index">
        <icon v-if="label.symbol" :name="label.symbol" />
        <span>{{ label.text }}</span>
      </label>
      <label/>
    </v-layout>

    <div class="fretboard">
      <div
        v-for="(string, i) in strings"
        :key="string"
        class="string"
      >
        <div
          v-for="(note, fret) in visiblestringsNotes[i]"
          :key="fret"
          class="fret"
          :style="{ backgroundColor: Colors[note.octave] }"
          @click="playNote(note, string, fret)"
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
    <v-layout class="settings">
      <v-select
        label="Style"
        :items="styles"
        v-model="style"
        hide-details
      />
      <v-select
        label="Length"
        :items="lengths"
        v-model="length"
        hide-details
      >
        <template slot="item" slot-scope="{ item }">
          <icon  :name="item.symbol" /><span v-text="item.text"/>
        </template>
        <icon slot="selection" slot-scope="{ item }" :name="item.symbol" />
      </v-select>
      <v-text-field
        v-model="fretsNumber"
        label="Frets"
        type="number"
        min="19"
        max="24"
        hide-details
      />
      <v-spacer/>
    </v-layout>
  </div>
</template>

<script>
import { Note } from 'tonal'
import { StringRoots, NoteLengths } from './constants'
import { Colors } from '../colors'
import SoundLabel from './BassLabel'
import { bufferLoader } from '@/core/buffer-loader'
import '../directives/drag-sound'

export default {
  props: {
    instrument: Object,
    frets: {
      type: Number,
      default: 24
    }
  },
  data () {
    return {
      style: 'finger',
      length: 8,
      fretsNumber: 19
    }
  },
  inject: ['$player'],
  computed: {
    strings () {
      return this.instrument.strings.split('').reverse()
    },
    stringsNotes () {
      return this.strings.map(string => this.stringNotes(StringRoots[string]))
    },
    visiblestringsNotes () {
      const size = parseInt(this.fretsNumber) + 1
      return this.stringsNotes.map(stringNotes => stringNotes.slice(0, size))
    },
    styles () {
      return [
        { text: 'Finger', value: 'finger' },
        { text: 'Slap', value: 'slap' },
        { text: 'Pop', value: 'pop' },
        { text: 'Pick', value: 'pick' },
        { text: 'Tap', value: 'tap' }
      ]
    },
    lengths () {
      return NoteLengths
    },
    labels () {
      const labels = Array(24).fill().map((v, i) => ({ text: `${i + 1}` }))
      ;[3, 5, 7, 9, 15, 17, 19, 21].forEach(i => { labels[i - 1]['symbol'] = 'fret-dot' })
      ;[12, 24].forEach(i => { labels[i - 1]['symbol'] = 'fret-dots' })
      return labels
    },
    visibleLabels () {
      return this.labels.slice(0, parseInt(this.fretsNumber))
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
      return {
        style: this.style,
        volume: 0.75,
        note: {
          type: 'regular',
          name: note,
          octave: octave,
          length: this.length,
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
            </div>//
          )
        }
      }
    },
    async playNote (note, string, fret) {
      const sound = this.fretSound(note.name, note.octave)
      sound.string = string
      sound.note.fret = fret
      sound.start = 0
      sound.end = 1
      const { instrument, audio } = this.$player.tracks.bass_0
      instrument.stop()
      const resources = instrument.soundResources(sound)
      await new Promise((resolve, reject) => bufferLoader.loadResources(resources, resolve, reject))
      instrument.playSound(audio, sound, this.$player.context.currentTime + 0.05, 1)
    }
  }
}
</script>

<style lang="scss" scoped>
.fretboard-labels {
  margin-right: 0.5em;
  label {
    flex: 1;
    text-align: center;
    color: #777;

    &:first-child {
      max-width: 3em;
    }
    &:last-child {
      max-width: 3em;
    }
    .icon {
      color: inherit;
      width: 0.75em;
      height: 0.75em;
    }
    span {
      font-size: 80%;
    }
  }
}
.fretboard {
  margin: 0 0.5em 0.5em 0;
  display: flex;
  flex-direction: column;
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
        max-width: 3em;
        min-width: 3em;
      }
      &.ghost {
        background-color: #ccc;
        max-width: 3em;
        min-width: 3em;
      }
      label {
        flex: 1;
        height: 100%;
        line-height: 2.5em;
        text-align: center;
      }
    }
    &:last-of-type {
      .fret {
        border-bottom: none;
      }
    }
  }
}
.settings {
  .input-group {
    margin: 0 0.25em;
    min-width: 75px;
    width: auto;
    flex: 0 1 auto;
    .input-group__input {
      justify-content: space-between;
    }
    .input-group__selections {
      width: auto;
    }
    svg.icon {
      width: 0.875em;
      height: 0.875em;
    }
  }
}
</style>

<style lang="scss">
.drag.sound {
  position: fixed;
  top: -80px;
  width: 4em;
}
.fret-drag.sound {
  position: absolute;
  width: 4em;
}

.menu__content--select {
  .icon {
    color: inherit!important;
    fill: currentColor;
    width: 0.875em;
    height: 0.875em;
    margin: 0 0.5em;
  }
}
</style>
