<template>
  <v-layout class="slide-editor">
    <div class="flex graph">
      <svg ref="svg" height="40" width="100%">
        <line
          x1="0" y1="0" :x2="start" y2="0"
          class="primary--text"
        />
        <line
          :x1="start" y1="0" :x2="end" y2="100%"
          class="primary--text"
        />
        <line
          :x1="end" y1="100%" x2="100%" y2="100%"
          class="primary--text"
        />
        <circle
          :cx="start" :cy="0" r="8"
          class="primary--text"
          @mousedown.prevent="startDrag($event, 'start')"
        />
        <circle
          :cx="end" cy="100%" r="8"
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
    minDist: {
      type: Number,
      default: 0.1
    }
  },
  computed: {
    start () {
      return perc(this.value.start)
    },
    end () {
      return perc(this.value.end)
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
  margin: 16px 0 6px 0;
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
