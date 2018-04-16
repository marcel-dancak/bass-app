import debounce from 'lodash/debounce'

const SwiperSlide = {
  render (h) {
    if (this.$slots.default) {
      // avoid unnecessary nesting
      return this.$slots.default[0]
    }
    return h('div')
  }
}

export default {
  components: {SwiperSlide},
  props: {
    items: Array,
    perView: {
      type: Number,
      validator: (value) => {
        return value > 0 && (!this.items || value < this.items.length)
      }
    },
    loop: Boolean,
    checkSwipeable: Boolean
  },
  data () {
    return {
      width: 0,
      index: 0,
      translate: 0,
      animate: true,
      visibleBefore: null
    }
  },
  computed: {
    slideStyle () {
      return {width: this.slideWidth + 'px'}
    },
    slideWidth () {
      return Math.floor(this.width / this.perView)
    },
    visible () {
      const fIndex = -this.translate / this.slideWidth
      const visible = {
        first: Math.floor(fIndex),
        last: Math.ceil(fIndex + this.perView) - 1
      }
      if (this.visibleBefore) {
        visible.first = Math.min(visible.first, this.visibleBefore.first)
        visible.last = Math.max(visible.last, this.visibleBefore.last)
      }
      visible.last = Math.min(visible.last, this.slides.length - 1)
      visible.last += 1
      return visible
    },
    minTranslate () {
      return -(this.slides.length - this.perView) * this.slideWidth
    },
    slides () {
      let slides = [].concat(this.items)
      if (this.loop) {
        slides = slides.concat(this.items.slice(0, this.perView + 1))
      }
      return slides
    }
  },
  watch: {
    perView () {
      const slidesCount = this.slides.length
      if (this.width - (slidesCount - this.index) * this.slideWidth > 40) {
        const index = -this.minTranslate / this.slideWidth
        console.log('WRONG', this.index, '->', index)
        this.setIndex(index, false)
      } else {
        this.setIndex(this.index, false)
      }
    }
  },
  created () {
    const swipe = {
      origin: {
        screen: 0,
        translate: 0
      },
      start: (e) => {
        if (this.checkSwipeable) {
          if (!this.isSwipeable(e)) {
            return
          }
        }
        if (this._animResetTimer) {
          console.log('** Animation Conflict')
          clearTimeout(this._animResetTimer)
        }
        // console.log(`Swipe Start (${e.type})`)
        document.addEventListener('mousemove', swipe.pointermove, false)
        // document.addEventListener('dragend', swipe.end, false)
        swipe.origin.screen = e.screenX
        swipe.origin.translate = this.translate
        this.animate = false
        swipe.points = []
      },
      end: (e) => {
        // console.log(`Swipe End (${e.type})`)
        document.removeEventListener('mousemove', swipe.pointermove)
        // document.removeEventListener('dragend', swipe.end, false)
        if (!swipe.points || swipe.points.length < 2) {
          return
        }

        this.animate = true
        if (this.translate > 0) {
          this.translate = 0
        } else {
          const t = performance.now()
          const points = swipe.points.slice(swipe.points.findIndex(p => t - p.time < 50))
          const delta = points[points.length - 1].screen - points[0].screen
          const fIndex = -this.translate / this.slideWidth
          let newIndex
          // console.log('delta', delta)
          if (Math.abs(delta) > 10) {
            newIndex = delta < 0 ? Math.ceil(fIndex) : Math.floor(fIndex)
          } else {
            newIndex = Math.round(fIndex)
          }
          const translate = this.translate
          this.setIndex(newIndex)
          if (this.translate === translate) {
            // transition will be not triggered, so we call 'after' event manually
            swipe.after(e)
          }
        }
        swipe.points = null
      },
      pointermove: (e) => {
        // console.log('pointermove')
        swipe.points.push({
          time: performance.now(),
          screen: e.screenX
        })
        this.translate = swipe.origin.translate + e.screenX - swipe.origin.screen
        if (this.translate > 0) {
          this.translate = 0
        //   swipe.origin.screen = e.screenX
        }
        if (this.translate < this.minTranslate) {
          this.translate = this.minTranslate
          // swipe.origin.screen = e.screenX
        }
      },
      after: (e) => {
        // console.log(`Swipe After (${e.type})`)
        this.visibleBefore = null
        if (this.loop && this.index >= this.items.length) {
          console.log('Seek loop')
          this.setIndex(this.index - this.items.length, false)
        }
      }
    }
    document.addEventListener('mouseup', swipe.end, false)
    document.addEventListener('touchend', swipe.end, false)
    this.swipe = swipe
  },
  mounted () {
    this.updateContainerSize()
    window.addEventListener('resize', this.updateContainerSize, false)
  },
  beforeDestroy () {
    document.removeEventListener('mouseup', this.swipe.end, false)
    document.removeEventListener('touchend', this.swipe.end, false)
    window.removeEventListener('resize', this.updateContainerSize, false)
  },
  methods: {
    resetAnimation () {
      if (this._animResetTimer) {
        clearTimeout(this._animResetTimer)
      }
      this._animResetTimer = setTimeout(() => {
        this.animate = true
        this._animResetTimer = null
      }, 30)
    },
    setIndex (index, animate = true) {
      this.index = Math.min(index, this.slides.length - this.perView)
      if (!animate) {
        this.animate = false
        this.resetAnimation()
      } else {
        this.visibleBefore = this.visible
      }
      this.translate = -this.slideWidth * this.index
    },
    isSwipeable (e) {
      // return e.path.slice(0, e.path.indexOf(this.$el)).find(el => el.getAttribute('swipeable'))
      let el = e.target
      while (el && el !== this.$el) {
        if (el.hasAttribute('swipeable')) {
          return true
        }
        el = el.parentElement
      }
    },
    scroll (e) {
      console.log('scroll')
    },
    updateContainerSize: debounce(
      function () {
        // this.width = this.$el.clientWidth
        if (this.$refs.slidesContainer) {
          this.width = this.$refs.slidesContainer.clientWidth
          console.log(this.width)
        } else {
          this.width = this.$el.children[0].clientWidth
        }
        // this.width = this.$el.children[0].clientWidth
        this.setIndex(this.index, false)
      },
      50
    )
  }
}
