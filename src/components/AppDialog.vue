<template>
  <v-dialog
    v-bind="_props"
    :value="visible"
    @input="onInput"
    @update:returnValue="onClose"
  >
    <v-slot :node="$slots.activator"/>
    <v-card ref="container">
      <v-card-title
        class="header px-4 py-2"
        primary-title
        @mousedown="onDragStart"
      >
        <span>{{ header }}</span>
        <v-btn icon @click="close">
          <v-icon>close</v-icon>
        </v-btn>
      </v-card-title>
      <v-slot :node="$slots.default"/>
    </v-card>
  </v-dialog>
</template>

<script>
// import VDialog from 'vuetify/es5/components/VDialog/VDialog'
import Draggable from '@/ui/draggable'

export default {
  name: 'app-dialog',
  props: {
    /* v-dialog props */
    fullWidth: Boolean,
    lazy: Boolean,
    value: Boolean,
    maxWidth: Number,
    /* new props */
    draggable: Boolean,
    header: String
  },
  data () {
    return {
      visible: false
    }
  },
  methods: {
    onDragStart (evt) {
      if (this.draggable) {
        this._draggable = this._draggable || Draggable(this.$refs.container.$el.parentElement)
        this._draggable.onDragStart(evt)
      }
    },
    close () {
      this.visible = false
    },
    onClose () {
      if (this._draggable) {
        this._draggable.reset()
        this._draggable = null
      }
    },
    onInput (visible) {
      this.visible = visible
    }
  }
}
</script>

<style lang="scss" scoped>
.card__title {
  justify-content: center;
  background: #263238;
  color: #fff;
  font-size: 115%;

  .btn {
    position: absolute;
    right: 0;
    top: 0;
    color: #fff;
    margin: 0.15em;
  }
}
.header {
  user-select: none;
}
</style>
