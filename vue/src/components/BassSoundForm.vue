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
const PlayingStyles = [
  {text: 'Finger', value: 'finger'},
  {text: 'Slap', value: 'slap'},
  {text: 'Pop', value: 'pop'},
  {text: 'Finger', value: 'finger'},
  {text: 'Pick', value: 'pick'},
  {text: 'Tap', value: 'tap'},
  {text: 'Hammer-On', value: 'hammer'},
  {text: 'Pill-Off', value: 'pull'},
  {text: 'Let ring (Tie)', value: 'ring'}
]
const NoteTypes = [
  {text: 'Regular', value: 'regular'},
  {text: 'Ghost', value: 'ghost'},
  {text: 'Slide', value: 'slide'},
  {text: 'Grace', value: 'grace'},
  {text: 'Bend', value: 'bend'},
  {text: 'Harmonics', value: 'harmonics'}
]

export default {
  props: ['sound'],
  data: () => ({
    PlayingStyles,
    NoteTypes
  }),
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
    align-items: center;
  }
  .input-group {
    label {
      font-size: 0.938em;
    }
  }
  .input-group--select .input-group__selections__comma {
    font-size: 0.938em;
  }
  .btn--icon {
    margin: 0;
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
