<template>
  <v-layout column>
    <v-layout>
      <v-flex xs6>
        <v-select
          label="Style"
          :items="PlayingStyles"
          v-model="sound.style"
          hide-details
        />
      </v-flex>
      <v-flex xs6>
        <v-select
          class="flex"
          label="Note"
          :items="NoteTypes"
          v-model="sound.note.type"
          hide-details
        />
      </v-flex>
    </v-layout>
    <v-layout>
      <note-select
        label="Pitch"
        :root="sound.string + '1'"
        :note="sound.note" />
      <note-select
        v-if="sound.endNote"
        label="End pitch"
        :root="sound.string + '1'"
        :note="sound.endNote" />
    </v-layout>
    <v-layout row>
      <v-flex xs4>
        <v-select
          label="Length"
          :items="NoteLengths"
          v-model="sound.note.length"
          hide-details>
          <template
            slot="selection"
            slot-scope="data">
            <icon :name="data.item.symbol" />
          </template>
        </v-select>
      </v-flex>
      <v-checkbox
        label="Dotted"
        color="primary"
        v-model="sound.note.dotted"
        hide-details
      />
      <v-checkbox
        label="Staccato"
        color="primary"
        v-model="sound.note.staccato"
        hide-details
      />
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
      <v-btn icon>
        <icon name="play" />
      </v-btn>
    </v-layout>
  </v-layout>
</template>

<script>
import { NoteLengths, NoteTypes, PlayingStyles } from './constants'
import NoteSelect from './NoteSelect'

export default {
  components: { NoteSelect },
  props: ['sound'],
  computed: {
    PlayingStyles: () => PlayingStyles,
    NoteTypes: () => NoteTypes,
    NoteLengths: () => NoteLengths
  },
  methods: {
  }
}
</script>

<style lang="scss">
.sound-form {
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
  .btn--icon {
    margin: 0.7em 0;
    padding: 0;
    font-size: 1em;
    width: 1.5em;
    height: 1.5em;
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
