<template>
  <div
    class="scroll-container"
    :class="wrapperClass"
    @mouseenter="recalculate">
    <div
      ref="trackY"
      class="simplebar-track vertical">
      <div
        class="simplebar-scrollbar"
        :class="{active: activeScroll}"
        :style="scrollbarStyleY"
        @mousedown="dragStart"></div>
    </div>
    <div
      ref="scrollContent"
      class="simplebar-scroll-content"
      :style="{
        paddingRight: `${scrollbarSize}px`
      }"
      @scroll="recalculate">
      <div
        class="simplebar-content"
        :class="contentClass"
        :style="{
          marginRight: `${-scrollbarSize}px`
        }">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script>
import 'simplebar/dist/simplebar.css'

export default {
  props: {
    wrapperClass: String,
    contentClass: String
  //   overflow: String // 'vertical', 'horizontal'
  },
  data: () => ({
    scrollbarSize: 14,
    activeScroll: false,
    scrollbarStyleY: {
      top: 0,
      height: 0
    }
  }),
  mounted () {
    this.recalculate()
    /*
    if (typeof MutationObserver !== 'undefined') {
      // create an observer instance
      this.mutationObserver = new MutationObserver(mutations => {
        console.log('mutations')
        mutations.forEach(mutation => {
          if (this.isChildNode(mutation.target) || mutation.addedNodes.length) {
            this.recalculate()
          }
        })
      })
      // pass in the target node, as well as the observer options
      this.mutationObserver.observe(
        this.$slots.default[0].elm,
        // { childList: true, subtree: true }
        { attributes: true, childList: true, characterData: true, subtree: true }
      )
    }
    */
  },
  methods: {
    recalculate () {
      // console.log('recalculate')
      const { offsetHeight, scrollHeight, scrollTop } = this.$refs.scrollContent
      const trackSize = this.$refs.trackY.offsetHeight
      const scrollbarSize = Math.round((offsetHeight / scrollHeight) * trackSize)
      const position = scrollTop / (scrollHeight - offsetHeight)

      this.scrollRatio = (scrollHeight - offsetHeight) / (trackSize - scrollbarSize)
      this.scrollbarStyleY.top = ((trackSize - scrollbarSize) * position) + 'px'
      this.scrollbarStyleY.height = scrollbarSize + 'px'
      this.scrollbarStyleY.display = scrollHeight > offsetHeight ? '' : 'none'
    },
    dragStart (evt) {
      this.dragOrigin = {
        x: evt.screenX,
        y: evt.screenY,
        scrollTop: this.$refs.scrollContent.scrollTop
      }
      this.activeScroll = true
      document.addEventListener('mousemove', this.dragMove)
      document.addEventListener('mouseup', this.dragEnd, {once: true})
      evt.preventDefault()
    },
    dragMove (evt) {
      const mouseOffset = (evt.screenY - this.dragOrigin.y) * this.scrollRatio
      this.$refs.scrollContent.scrollTop = this.dragOrigin.scrollTop + mouseOffset
    },
    dragEnd (evt) {
      this.activeScroll = false
      document.removeEventListener('mousemove', this.dragMove)
    }
  }
}
</script>

<style lang="scss">
.scroll-container {
  position: relative;
  overflow: hidden!important;
  display: flex;
}

.simplebar-track {
  .simplebar-scrollbar.active:before {
    opacity: 0.65;
  }
}
.scroll-container:hover > .simplebar-track.vertical {
  .simplebar-scrollbar:before {
    opacity: 0.65;
  }
}
</style>