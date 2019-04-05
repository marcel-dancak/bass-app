<template>
  <v-layout class="bend-editor">
    <div class="flex graph">
      <svg ref="svg" height="60" width="100%">
        <g transform="translate(0 4)">
          <line x1="0" y1="50%" x2="100%" y2="50%" class="grid"/>
          <line x1="0" y1="0" x2="100%" y2="0" class="grid"/>
          <line x1="0" y1="100%" x2="100%" y2="100%" class="grid"/>
          <line
            v-for="(p, index) in points"
            :key="`g_${index}`"
            :x1="p.x"
            :x2="p.x"
            y1="0"
            y2="100%"
            class="grid"
          />
          <line
            v-for="(p, index) in lines"
            :key="`l_${index}`"
            class="line primary--text"
            v-bind="p"
          />
          <circle
            v-for="(p, index) in points"
            :key="`p_${index}`"
            :cx="p.x"
            :cy="p.y"
            r="8"
            class="primary--text"
            @mousedown.prevent="startDrag(index, $event)"
          />
        </g>
      </svg>
    </div>
    <v-layout class="controls column align-center justify-center">
      <v-btn icon @click="addPoint">
        <v-icon>add</v-icon>
      </v-btn>
      <v-btn icon @click="removePoint">
        <v-icon>remove</v-icon>
      </v-btn>
    </v-layout>
  </v-layout>
</template>

<script>
function perc (val) {
  return (100 * val).toFixed(2) + '%'
}
export default {
  props: {
    value: Array,
    min: {
      type: Number,
      default: 0
    },
    max: {
      type: Number,
      default: 2
    }
  },
  computed: {
    points () {
      return this.value.map((v, i) => ({
        x: perc(i / (this.value.length - 1)),
        y: perc(1 - v / this.max)
      }))
    },
    lines () {
      return this.points.slice(0, -1).map((p, i) => {
        const p2 = this.points[i + 1]
        return { x1: p.x, y1: p.y, x2: p2.x, y2: p2.y }
      })
    }
  },
  methods: {
    startDrag (index, evt) {
      this.dragStart = {
        index,
        y: evt.clientY,
        value: this.value[index],
        bounds: this.$refs.svg.getBoundingClientRect()
      }
      document.addEventListener('mousemove', this.dragMove)
      document.addEventListener('mouseup', () => document.removeEventListener('mousemove', this.dragMove), { once: true })
    },
    dragMove (evt) {
      const dy = (evt.clientY - this.dragStart.y) / this.dragStart.bounds.height
      const y = this.dragStart.value - this.max * dy
      this.$set(this.value, this.dragStart.index, Math.min(Math.max(this.min, y), this.max))
    },
    addPoint () {
      this.value.push(0)
    },
    removePoint () {
      if (this.value.length > 2) {
        this.value.pop()
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.graph {
  position: relative;
  margin: 16px;
  padding: 0!important;
  // background-color: #f5f5f5;
  svg {
    overflow: visible;
    line {
      &.line {
        stroke-width: 2px;
        stroke: currentColor;
      }
      &.grid {
        stroke-width: 1px;
        stroke: grey;
        opacity: 0.25;
      }
    }
    circle {
      stroke-width: 2px;
      stroke: currentColor;
      fill: #eee;
      transition: fill 0.2s ease;
      &:hover {
        fill: currentColor;
      }
    }
  }
}
.bend-editor {
  .btn.btn--icon {
    min-height: 1em;
    margin: 0.25em;
    background-color: #f3f3f3;
  }
}
</style>
