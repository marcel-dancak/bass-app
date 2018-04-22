<template>
  <div
    v-if="selectionRect"
    class="mouse-selection"
    :style="{
      left: selectionRect.left + 'px',
      top: selectionRect.top + 'px',
      width: selectionRect.width + 'px',
      height: selectionRect.height + 'px'
    }">
  </div>
</template>

<script>
export default {
  data: () => ({
    selectionRect: null
  }),
  mounted () {
    this.$parent.$el.addEventListener('mousedown', this.startSelection, true)
  },
  beforeDestroy () {
    this.$parent.$el.removeEventListener('mousedown', this.startSelection, true)
  },
  methods: {
    startSelection (evt) {
      if (!evt.shiftKey) return
      evt.stopPropagation()

      const origin = {
        x: evt.clientX,
        y: evt.clientY
      }
      this.selectionRect = {
        left: evt.clientX,
        top: evt.clientY,
        width: 0,
        height: 0
      }
      const dragHandler = (e) => {
        // console.log('move')
        this.selectionRect.left = Math.min(origin.x, e.clientX)
        this.selectionRect.top = Math.min(origin.y, e.clientY)
        this.selectionRect.width = Math.abs(origin.x - e.clientX) + 1
        this.selectionRect.height = Math.abs(origin.y - e.clientY) + 1
      }
      document.addEventListener('mouseup', (evt) => {
        document.removeEventListener('mousemove', dragHandler)
        const { left, top, width, height } = this.selectionRect
        const selection = {
          x1: left,
          y1: top,
          x2: left + width,
          y2: top + height,
          width,
          height
        }
        this.$emit('selected', selection)
        this.selectionRect = null
      }, {once: true})
      document.addEventListener('mousemove', dragHandler)
    }
  }
}
</script>

<style>
.mouse-selection {
  position: fixed;
  border: 2px solid #FFC107;
  background-color: rgba(255,224,130 ,0.75);
  opacity: 0.5;
}
</style>
