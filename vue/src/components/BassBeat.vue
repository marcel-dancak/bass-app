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
      <sound-top-label :key="i" :sound="sound" />
      <div
        :key="i"
        ref="sound"
        class="sound"
        :class="{selected: editor.selection.includes(sound)}"
        click="e => $emit('soundClick', e, sound)"
        @click="e => editor.select(e, sound)"
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
import SoundLabel from './BassLabel'
import SoundTopLabel from './SoundTopLabel'

export default {
  name: 'bass-beat',
  components: { SoundLabel, SoundTopLabel },
  props: ['editor', 'beat', 'instrument', 'display'],
  computed: {
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
    top: 0;
    height: 2.25em;
    line-height: 2.25em;
    z-index: 100;
    color: #222;

    .label {
      padding: 1px;
    }
    &.selected .label {
      border: 2px solid #333;
      padding: 0;
    }
  }
}
</style>
