<template>
  <div
    class="swiper"
    @mousedown="swipe.start"
    @touchstart="swipe.start"
    @wheel="scroll">
    <div
      class="slides-container"
      :class="[direction, {animate: animate}]"
      :style="{transform: transform}"
      @transitionend="swipe.after">

<!--       <div
        v-for="(item, i) in items"
        :key="i"
        class="slide"
        :style="{minWidth: slideWidth}">
        <slot
          name="item"
          :item="item"
          v-if="i >= visible.first && i <= visible.last">
        </slot>
      </div> -->

        <!-- :style="{minWidth: slideWidthPx + 'px'}" -->
      <swiper-slide
        v-for="(item, i) in slides"
        ref="slides"
        :key="i"
        :style="slideStyle"
        :class="{last: i === items.length - 1}">
        <slot
          name="item"
          :item="item"
          v-if="i >= visible.first && i <= visible.last">
        </slot>
      </swiper-slide>

    </div>
    <br />
    <!-- <p><small>Show: {{ visible.first + 1 }} - {{ visible.last + 1 }} (width: {{ width }})</small></p> -->
  </div>
</template>

<script>
import Swiper from './Base.js'

export default {
  name: 'swiper',
  mixins: [Swiper]
}
</script>

<style lang="scss">
.swiper {
  user-select: none;
  overflow: hidden;
  margin-top: 2em;

  .slides-container {
    display: flex;
    flex-direction: row;
    position: relative;
    &.vertical {
      flex-direction: column;
    }
    &.animate {
      transition: transform .4s ease;
    }
  }
}
</style>
