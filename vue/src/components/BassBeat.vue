<template>
  <div
    class="bass-beat">
    <div class="">
      <div
        v-for="string in strings"
        :key="string"
        class="string">
      </div>
    </div>

    <div
      v-for="(sound, i) in beat.data"
      :key="i"
      class="sound"
      :class="{selected: false}"
      :style="{
        left: (sound.start * 100)+ '%',
        top: stringsPositions[sound.string],
        width: 100 * (sound.end - sound.start) + '%',
        backgroundColor: colors[sound.note.octave]
      }">
      {{ sound.note.name }}
    </div>
  </div>
</template>

<script>
import { Colors } from '../colors'

export default {
  name: 'bass-beat',
  props: ['beat', 'instrument'],
  data: () => ({
  }),
  computed: {
    colors () {
      return Colors
    },
    strings () {
      return [].concat(this.instrument.strings).reverse()
    },
    stringsPositions () {
      const positions = {}
      this.strings.forEach((s, i) => {
        positions[s] = (100 * i / this.strings.length) + '%'
      })
      return positions
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
    height: 2.25em;
    line-height: 2.25em;
    background-color: #ccc;
    border-radius: 4px;
    border: 1px solid #555;
    z-index: 100;
    box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.26);
    box-sizing: border-box;
    color: #222;
  }
}
</style>
