<template>
  <div class="bass-beat">
    <div>
      <div
        v-for="string in strings"
        :key="string"
        class="string">
      </div>
    </div>
    <template v-for="(sound, i) in beat.data">
      <sound-top-label :key="'l'+i" :sound="sound" />
      <div
        :key="sound.id"
        ref="sound"
        v-bind-el="sound"
        class="sound"
        :style="{
          left: (sound.start * 100) + '%',
          top: stringsPositions[sound.string],
          width: 100 * (sound.end - sound.start) + '%'
        }">
        <sound-label :sound="sound" :display="display" />
      </div>
    </template>
  </div>
</template>

<script>
import SoundLabel from '../BassLabel'
import SoundTopLabel from '../SoundTopLabel'

export default {
  name: 'bass-beat',
  components: { SoundLabel, SoundTopLabel },
  props: ['beat', 'instrument', 'display'],
  computed: {
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
  }
}
</script>

<style lang="scss">
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
  }
}
</style>
