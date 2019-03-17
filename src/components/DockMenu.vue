<template>
  <v-menu
    ref="menu"
    :close-on-content-click="false"
    :close-on-click="!detached"
    :value="detached"
    v-bind="_props"
    @update:returnValue="onClose"
  >
    <v-slot :node="$slots.activator"/>
    <div
      ref="container"
      class="menu-container"
    >
      <slot/>
    </div>
  </v-menu>
</template>

<script>
import Draggable from '@/ui/draggable'

export default {
  name: 'dock-menu',
  props: ['contentClass'],
  data () {
    return {
      left: 0,
      detached: false
    }
  },
  methods: {
    toggle () {
      this.detached = !this.detached
    },
    startDragging (evt) {
      if (this.detached) {
        this._draggable = this._draggable || Draggable(this.$refs.container.parentElement)
        this._draggable.onDragStart(evt)
      }
    },
    onClose () {
      if (this._draggable) {
        setTimeout(() => {
          this._draggable.reset()
          this._draggable = null
        }, 350)
      }
    }
  }
}
</script>
