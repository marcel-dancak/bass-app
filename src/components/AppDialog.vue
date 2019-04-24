<template>
  <v-dialog
    v-bind="_props"
    :value="visible"
    @input="onInput"
    @update:returnValue="onClose"
  >
    <!-- <v-slot :node="$slots.activator"/> -->
    <div @click="visible = true" slot="activator">
      <slot name="activator"/>
    </div>
    <v-card ref="container">
      <v-card-title
        class="header"
        @mousedown="onDragStart"
      >
        <span>{{ header }}</span>
        <v-btn icon small @click="close">
          <v-icon>close</v-icon>
        </v-btn>
      </v-card-title>
      <transition :duration="visible ? 0 : 400">
        <v-slot v-if="visible" :node="$slots.default"/>
      </transition>
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
    persistent: Boolean,
    hideOverlay: Boolean,
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
  watch: {
    value (value) {
      if (value) {
        this.visible = true
      }
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
      this.$emit('update:value', false)
    },
    onInput (visible) {
      this.visible = visible
    }
  }
}
</script>

<style lang="scss" scoped>
.v-card__title {
  justify-content: center;
  background: #263238;
  color: #fff;
  font-size: 115%;

  .v-btn {
    position: absolute;
    right: 0;
    top: 0;
    color: #fff;
    margin: 0.15em;
  }
}
.header {
  user-select: none;
  padding: 0.35em 0.5em;
  > span {
    font-size: 14px;
    font-weight: 500;
  }
}
</style>
