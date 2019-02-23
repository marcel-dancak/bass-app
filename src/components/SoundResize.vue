<template>
  <div
    ref="container"
    :class="[{active}, 'resize-container']">
    <template v-if="active">
      <div
        class="bg"
        :style="{width: width + 'px'}"
      />
      <div
        class="highlight"
        :style="{width: alignedLength.width + 'px'}">
        <div class="symbol">
          <icon :name="alignedLength.symbol" />
          <span v-show="alignedLength.params.dotted">•</span>
        </div>
      </div>
    </template>
    <div
      class="handler"
      @mousedown.stop="startResize">
      <span>◀</span>
      <span>▶</span>
    </div>
  </div>
</template>

<script>
import { NoteLengths } from './constants'

const Lengths = [
  {
    length: 1,
    dotted: false
  }, {
    length: 1,
    dotted: true
  }, {
    length: 2,
    dotted: false
  }, {
    length: 2,
    dotted: true
  }, {
    length: 4,
    dotted: false
  }, {
    length: 4,
    dotted: true
  }, {
    length: 8,
    dotted: false
  }, {
    length: 8,
    dotted: true
  }, {
    length: 16,
    dotted: false
  }, {
    length: 16,
    dotted: true
  } /*, {
    length: 32,
    dotted: false
  } */
]

export default {
  props: ['sound', 'editor'],
  data: () => ({
    active: false,
    width: 0
  }),
  computed: {
    alignedLength () {
      let delta, closestWidth, closesLength
      let minDelta = this.notesWidths[0]
      this.notesWidths.forEach((width, index) => {
        delta = Math.abs(this.width - width)
        if (delta < minDelta) {
          closestWidth = width
          minDelta = delta
          closesLength = Lengths[index]
        }
      })
      return {
        width: closestWidth,
        params: closesLength,
        symbol: NoteLengths.find(i => i.value === closesLength.length).symbol
      }
    }
  },
  methods: {
    startResize (e) {
      this.editor.select(e, this.sound)

      this.bounds = this.$refs.container.getBoundingClientRect()
      this.width = this.bounds.width
      this.active = true

      const trackSection = this.sound.beat.section
      const beatWidth = (this.bounds.width / trackSection.soundDuration(this.sound))
      var dummySound = { beat: this.sound.beat }
      this.notesWidths = Lengths.map(noteLength => {
        dummySound.note = noteLength
        return trackSection.soundDuration(dummySound) * beatWidth
      })

      document.addEventListener('mousemove', this.resize)
      document.addEventListener('mouseup', this.endResize, {once: true})
    },
    resize (e) {
      this.width = e.clientX - this.bounds.left
    },
    endResize (e) {
      document.removeEventListener('mousemove', this.resize)
      // Object.assign(this.sound.note, this.alignedLength.params)
      const { length, dotted } = this.alignedLength.params
      this.editor.resizeSound(this.sound, length, dotted)
      this.active = false
    }
  }
}
</script>

<style lang="scss">
.resize-container {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  .bg, .highlight {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    border-radius: 4px;
  }
  .bg {
    background-color: rgba(3,169,244, 0.25);
  }
  .highlight {
    border: 2px solid #03A9F4;
    .symbol {
      position: absolute;
      right: 0.25em;
      top: -1.75em;
      display: flex;
      justify-content: flex-end;
      .icon {
        font-size: 1em;
        width: 1.25em;
        height: 1.25em;
      }
    }
  }
  .handler {
    display: flex;
    flex-direction: column;
    justify-content: center;
    position: absolute;
    width: 1.5em;
    right: 0;
    height: inherit;
    font-size: 0.75em;
    cursor: col-resize;
    opacity: 0;
    will-change: opacity;
    transition: 0.2s opacity ease;
    > span {
      height: 1em;
      line-height: 0.85em;
      transform: scale(0.5, 1);
    }
  }
  &:hover, &.active {
    .handler {
      opacity: 1;
    }
  }
}
</style>
