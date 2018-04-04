<template>
  <div
    class="drum-beat"
    :style="{minHeight: (instrument.drums.length * 3) + 'em'}"
    @click="handleClick"
    @wheel.stop="handleWheel">
    <div class="grid">
      <svg width="100%" height="100%">
        <g
          v-for="(y, i) in instrument.drums"
          :style="{transform: `translate(0, ${i * 3}em)`}">
          <circle
            v-for="cx in grid"
            :cx="cx"
            cy="1.5em"
            r="1em"
            fill="none"
            stroke="#ccc"/>
        </g>
      </svg>
    </div>
    <transition-group name="scale" xtag="div">
      <div
        v-for="(sound, i) in beat.data"
        :key="sound.id"
        ref="sound"
        v-bind-el="sound"
        class="drum sound"
        :class="{ selected: editor.selection.includes(sound) }"
        :style="{
          left: ((sound.start + (0.5 / beat.subdivision)) * 100) + '%',
          top: drumPosition[sound.drum]
        }"
        xv-drag-sound="(e) => initDrag(e, sound)">
        <div :style="{transform: `scale(${sound.volume}, ${sound.volume})`}" />
      </div>
    </transition-group>
  </div>
</template>

<script>
import '../directives/drag-sound'

const DrumsVolumeLevels = [0.0, 0.85, 0.4]

export default {
  name: 'drum-beat',
  props: ['editor', 'beat', 'instrument'],
  computed: {
    grid () {
      const grid = []
      const size = this.beat.grid || this.beat.subdivision
      for (let i = 0; i < size; i++) {
        const cx =  ((i + 1) * (100 / size)) - (50 / size)
        grid.push(cx + '%')
      }
      return grid        
    },
    drumPosition () {
      const positions = {}
      this.instrument.drums.forEach((drum, i) => {
        positions[drum.name] = (i * 3) + 'em'
      })
      return positions
    }
  },
  mounted () {
    this.fontSize = parseFloat(getComputedStyle(this.$el).fontSize)
  },
  methods: {
    subbeatCell (evt) {
      const grid = this.beat.grid || this.beat.subdivision
      var box = this.$el.getBoundingClientRect()
      var x = evt.clientX - box.left
      var y = evt.clientY - box.top

      const cell = box.width / grid
      const subbeat = 1 + parseInt(x / cell)

      const cellHeight = box.height / this.instrument.drums.length
      const drumIndex = parseInt(y / cellHeight)

      const dx = Math.abs(x - (subbeat - 0.5) * (box.width / grid))
      const dy = Math.abs(y - (drumIndex + 0.5) * (box.height / this.instrument.drums.length))
      if (Math.max(dx, dy) > this.fontSize) {
        return null
      }
      return {
        subbeat,
        start: (subbeat - 1) / grid,
        drum: this.instrument.drums[drumIndex].name
      }
    },
    handleClick (e) {
      const cell = this.subbeatCell(e)
      if (!cell) return

      let sound = this.beat.section.sound(this.beat, {start: cell.start, drum: cell.drum})
      if (sound) {
        const index = DrumsVolumeLevels.indexOf(sound.volume)
        const nextIndex = (index + 1) % DrumsVolumeLevels.length
        sound.volume = DrumsVolumeLevels[nextIndex]
        if (sound.volume < 0.05) {
          this.beat.section.deleteSound(sound)
        }
      } else {
        sound = {start: cell.start, drum: cell.drum, volume: 0.85}
        this.beat.section.addSound(this.beat, sound)
      }
    },
    handleWheel (e) {
      const dir = e.deltaY > 0 ? -1 : 1
      const cell = this.subbeatCell(e)
      let sound = this.beat.section.sound(this.beat, {start: cell.start, drum: cell.drum})
      if (!sound && dir > 0) {
        sound = {
          start: cell.start,
          drum: cell.drum,
          volume: 0
        }
        this.beat.section.addSound(this.beat, sound)
      }
      if (sound) {
        sound.volume += dir * 0.05
        if (sound.volume < 0.05) {
          this.beat.section.deleteSound(sound)
        } else if (sound.volume > 1) {
          sound.volume = 1
        }
      }
    }
  }
}
</script>

<style lang="scss">
.drum-beat {
  position: relative;
  .grid {
    height: 100%;
  }
}

.drum.sound {
  width: 2em;
  height: 2em;
  border-radius: 50%;
  position: absolute;
  transform: translate(-50%, 0.5em) scale(1, 1);
  box-sizing: border-box;
  &.selected {
    border: 2px solid #777;
  }
  > div {
    background-color: orange;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    transition: transform 0.25s ease;
  }

  &.scale-enter-active, &.scale-leave-active {
    transition: transform 0.25s ease;
  }
  &.scale-enter, &.scale-leave-to {
    transform: translate(-50%, 0.5em) scale(0, 0);
  }
}
</style>
