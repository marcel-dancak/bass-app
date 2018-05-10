<template>
  <div
    class="drum-beat"
    :style="{minHeight: (instrument.drums.length * 2) + 'em'}">
    <div class="grid">
      <svg width="100%" height="100%">
        <g
          v-for="(drum, i) in instrument.drums"
          :key="i"
          :style="{transform: `translate(0, ${i * 2}em)`}">
          <circle
            v-for="cx in grid"
            :key="cx"
            :cx="cx"
            cy="1em"
            r="0.75em"
            fill="none"
            stroke="#ccc"/>
        </g>
      </svg>
    </div>
    <div
      v-for="sound in beat.data"
      :key="sound.id"
      ref="sound"
      class="drum sound"
      :style="{
        left: ((sound.start + (0.5 / beat.subdivision)) * 100) + '%',
        top: drumPosition[sound.drum]
      }">
      <div :style="{transform: `scale(${sound.volume}, ${sound.volume})`}" />
    </div>
  </div>
</template>

<script>

export default {
  name: 'drum-beat',
  props: ['beat', 'instrument'],
  computed: {
    grid () {
      const grid = []
      const size = this.beat.grid || this.beat.subdivision
      for (let i = 0; i < size; i++) {
        const cx = ((i + 1) * (100 / size)) - (50 / size)
        grid.push(cx + '%')
      }
      return grid
    },
    drumPosition () {
      const positions = {}
      this.instrument.drums.forEach((drum, i) => {
        positions[drum.name] = (i * 2) + 'em'
      })
      return positions
    }
  }
}
</script>

<style lang="scss">
.viewer {
  .drum-beat {
    display: flex;
    flex-grow: 1;
    position: relative;
    .grid {
      height: inherit;
      svg {
        /* required for correct scrollHeight - https://stackoverflow.com/questions/19719797/what-is-the-difference-between-offsetheight-and-scrollheight-of-an-element-in-do/19719861 */
        /* display: block; */
      }
    }
  }

  .drum.sound {
    width: 1.5em;
    height: 1.5em;
    transform: translate(-50%, 0.25em);
  }
}
</style>
