<template>
  <div
    class="swiper"
    @mousedown="swipe.start"
    @xwheel="scroll">

    <div
      class="slides-container"
      :class="{animate: animate}"
      :style="{transform: `translate3d(${translate}px, 0, 0)`}"
      @transitionend="swipe.after">

      <swiper-slide
        v-for="(item, i) in slides"
        :key="i"
        :style="slideStyle"
        :class="{last: i === items.length - 1}">
        <slot
          name="header"
          :item="item"
          v-if="i >= visible.first && i <= visible.last">
        </slot>
      </swiper-slide>
    </div>

    <scroll-area overflow="vertical" @wheel.native.stop="">
      <div
        class="slides-container"
        :class="{animate: animate}"
        :style="{transform: `translate3d(${translate}px, 0, 0)`}">

        <swiper-slide
          v-for="(item, i) in slides"
          ref="slides"
          :key="'c'+i"
          :style="slideStyle"
          :class="{last: i === items.length - 1}">
          <slot
            name="content"
            :item="item"
            v-if="i >= visible.first && i <= visible.last">
          </slot>
        </swiper-slide>

      </div>
    </scroll-area>
    <br />
    <!-- <p><small>Show: {{ visible.first + 1 }} - {{ visible.last + 1 }} (width: {{ width }})</small></p> -->
  </div>
</template>

<script>
import Swiper from './Base.js'

export default {
  name: 'dual-swiper',
  mixins: [Swiper]
}
</script>

<style lang="scss">
.swiper {
  user-select: none;
  overflow: hidden;
  margin-top: 2em;

  .simplebar-content {
    overflow: hidden;
  }
  .slides-container {
    display: flex;
    flex-direction: row;
    position: relative;
    &.animate {
      transition: transform .4s ease;
    }
  }
}
</style>
