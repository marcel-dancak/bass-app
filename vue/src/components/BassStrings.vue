<template>
  <div class="bass-strings">
    <div v-for="note in rootNotes" :key="note.name">
      <span>{{ note.name }}<sub>{{ note.octave }}</sub></span>
    </div>
  </div>
</template>

<script>
import { StringRoots } from './constants'
import { parseNote } from '../core/note-utils'

export default {
  props: ['instrument'],
  computed: {
    rootNotes () {
      const strings = this.instrument.strings.split('').reverse()
      return strings.map(name => parseNote(StringRoots[name]))
    }
  }
}
</script>

<style lang="scss">
.bass-strings {
  margin-top: 1.75em;
  text-align: center;

  > div {
    height: 2.25em;
    line-height: 2.25em;
    font-weight: 500;
    span {
      font-size: 110%;
    }
    sub {
      opacity: 0.55;
    }
  }
}
</style>
