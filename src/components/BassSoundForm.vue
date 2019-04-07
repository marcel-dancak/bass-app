<template>
  <v-layout class="column sound-form">
    <v-layout>
      <v-flex xs6>
        <v-select
          label="Style"
          :items="PlayingStyles"
          :value="sound.style"
          @input="editor.setStyle(sound, $event)"
          hide-details
        />
      </v-flex>
      <v-flex xs6>
        <v-select
          class="flex"
          label="Note"
          :items="NoteTypes"
          :value="sound.note.type"
          @input="setType"
          hide-details
        />
      </v-flex>
    </v-layout>
    <v-layout>
      <note-select
        label="Pitch"
        :root="StringRoots[sound.string]"
        :note="sound.note"
      />
      <note-select
        v-if="sound.endNote"
        label="End pitch"
        :root="StringRoots[sound.string]"
        :note="sound.endNote"
      />
    </v-layout>
    <template v-if="sound.note.bend">
      <div class="ml-1 input-group input-group--dirty input-group--text-field">
        <label>Bend graph</label>
      </div>
      <bend-editor v-model="sound.note.bend"/>
    </template>

    <template v-if="sound.note.slide">
      <div class="ml-1 input-group input-group--dirty input-group--text-field">
        <label>Slide graph</label>
      </div>
      <slide-editor v-model="sound.note.slide"/>
    </template>

    <v-layout class="length" row>
      <v-flex style="flex: 0 0 28%">
        <v-select
          label="Length"
          :items="NoteLengths"
          :value="sound.note.length"
          @input="v => editor.resizeSound(sound, v, sound.note.dotted)"
          hide-details
        >
          <template slot="item" slot-scope="{ item }">
            <icon :name="item.symbol" class="mr-2"/>
            <span v-text="item.text"/>
          </template>
          <template
            slot="selection"
            slot-scope="{ item }">
            <icon :name="item.symbol"/>
          </template>
        </v-select>
      </v-flex>
      <v-checkbox
        label="Dotted"
        color="primary"
        :input-value="sound.note.dotted"
        @change="v => editor.resizeSound(sound, sound.note.length, v)"
        hide-details
      />
      <v-checkbox
        label="Staccato"
        color="primary"
        v-model="sound.note.staccato"
        hide-details
      />
      <div />
    </v-layout>
    <v-layout row>
      <v-flex xs3>
        <v-text-field
          label="Volume"
          type="number"
          :min="0"
          :max="1"
          :step="0.05"
          v-model="sound.volume"
          hide-details
        />
      </v-flex>
      <v-flex xs7>
        <v-slider
          :min="0"
          :max="1"
          :step="0.01"
          v-model="sound.volume"
          hide-details
        />
      </v-flex>
      <v-btn icon @click="playSound">
        <icon name="play"/>
      </v-btn>
    </v-layout>
  </v-layout>
</template>

<script>
import { NoteLengths, NoteTypes, PlayingStyles, StringRoots } from './constants'
import { bufferLoader } from '@/core/buffer-loader'
import NoteSelect from './NoteSelect'
import BendEditor from './BendEditor'
import SlideEditor from './SlideEditor'

export default {
  components: { NoteSelect, BendEditor, SlideEditor },
  props: ['sound', 'editor'],
  computed: {
    PlayingStyles: () => PlayingStyles,
    NoteTypes: () => NoteTypes,
    NoteLengths: () => NoteLengths,
    StringRoots: () => StringRoots,
    trackId () {
      return this.$store.track.id
    },
    $section () {
      return this.$service('section')
    }
  },
  methods: {
    setType (type) {
      const hasEndNote = type === 'slide' || type === 'grace'
      if (hasEndNote) {
        const { name, octave, fret } = this.sound.note
        this.$set(this.sound, 'endNote', { name, octave, fret })
      } else {
        this.$delete(this.sound, 'endNote')
        // delete this.sound.endNote
      }
      if (type === 'slide') {
        this.$set(this.sound.note, 'slide', { start: 0.2, end: 0.8 })
      } else if (this.sound.note.slide) {
        this.$delete(this.sound.note, 'slide')
      }
      if (type === 'bend') {
        this.$set(this.sound.note, 'bend', [0, 0, 0, 0])
      } else if (this.sound.note.bend) {
        this.$delete(this.sound.note, 'bend')
      }
      this.sound.note.type = type
    },
    async playSound () {
      const trackSection = this.$section.tracks[this.trackId]
      const { instrument, audio } = this.$player.tracks[this.trackId]
      const sounds = [this.sound, ...trackSection.nextSounds(this.sound)]

      const resources = []
      sounds.forEach(s => resources.push(...instrument.soundResources(s)))
      instrument.stop()
      await new Promise((resolve, reject) => {
        bufferLoader.loadResources(Array.from(resources), resolve, reject)
      })

      let start = this.$player.context.currentTime + 0.05
      const beatTime = 60 / (this.$section.bpm)
      sounds.forEach(sound => {
        instrument.playSound(audio, sound, start, beatTime)
        start += trackSection.soundDuration(sound)
      })
    }
  }
}
</script>

<style lang="scss">
.sound-form {
  padding: 0.25em;
  min-width: 280px!important;
  max-width: 300px;
  background-color: #fff;
  .layout > * {
    padding: 0.25em;
  }
  .layout.row {
    align-items: flex-end;
  }
  .input-group {
    label {
      font-size: 0.938em;
    }
    .input-group__selections {
      height: 2.5em;
      .icon {
        font-size: 1em;
        width: 1.25em;
        height: 1.25em;
      }
    }
  }
  .input-group--select .input-group__selections__comma {
    font-size: 0.938em;
  }
  .btn.btn--icon {
    margin: 0.7em 0;
    padding: 0;
    font-size: 1em;
    width: 1.5em;
    height: 1.5em;
    color: #777;
    .icon {
      width: 1.5em;
      height: 1.5em;
    }
  }
}

.theme--light .input-group:not(.input-group--error) .input-group__details:before {
  opacity: 0.4;
}
.theme--dark .input-group:not(.input-group--error) .input-group__details:before {
  opacity: 0.65;
}
</style>
