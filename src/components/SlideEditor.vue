<template>
  <v-layout class="slide-editor">
    <div class="flex graph">
      <svg ref="svg" height="40" width="100%">
        <line
          x1="0" :y1="startY" :x2="startX" :y2="startY"
          class="primary--text"
        />
        <line
          :x1="startX" :y1="startY" :x2="endX" :y2="endY"
          class="primary--text"
        />
        <line
          :x1="endX" :y1="endY" x2="100%" :y2="endY"
          class="primary--text"
        />
        <circle
          :cx="startX" :cy="startY" r="8"
          class="primary--text"
          @mousedown.prevent="startDrag($event, 'start')"
        />
        <circle
          :cx="endX" :cy="endY" r="8"
          class="primary--text"
          @mousedown.prevent="startDrag($event, 'end')"
        />
      </svg>
    </div>
  </v-layout>
</template>

<script>
function perc (val) {
  return (100 * val).toFixed(2) + '%'
}
export default {
  props: {
    value: Object,
    up: {
      type: Boolean,
      default: true
    },
    minDist: {
      type: Number,
      default: 0.1
    }
  },
  computed: {
    startX () {
      return perc(this.value.start)
    },
    startY () {
      return this.up ? '100%' : '0'
    },
    endX () {
      return perc(this.value.end)
    },
    endY () {
      return this.up ? '0' : '100%'
    }
  },
  methods: {
    startDrag (evt, prop) {
      this.dragStart = {
        prop,
        x: evt.clientX,
        value: this.value[prop],
        bounds: this.$refs.svg.getBoundingClientRect()
      }
      document.addEventListener('mousemove', this.dragMove)
      document.addEventListener('mouseup', () => document.removeEventListener('mousemove', this.dragMove), { once: true })
    },
    dragMove (evt) {
      const { prop } = this.dragStart
      const dx = (evt.clientX - this.dragStart.x) / this.dragStart.bounds.width
      const value = this.dragStart.value + dx
      const min = prop === 'start' ? 0 : this.value.start + this.minDist
      const max = prop === 'start' ? this.value.end - this.minDist : 1
      this.value[prop] = Math.min(Math.max(min, value), max)
    }
  }
}
</script>

<style lang="scss" scoped>
.graph {
  position: relative;
  margin: 16px 16px 6px 16px;
  padding: 0!important;
  svg {
    overflow: visible;
    line, polyline {
      fill: none;
      stroke-width: 2px;
      stroke: currentColor;
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
</style>
