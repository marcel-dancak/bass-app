import debounce from 'lodash/debounce'
import throttle from 'lodash/throttle'

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
    checkSwipeable: Boolean,
    direction: {
      type: String,
      default: 'horizontal'
    }
  },
  data () {
    return {
      width: 0,
      height: 0,
      index: 0,
      translate: 0,
      animate: true,
      visibleBefore: null
    }
  },
  computed: {
    slideStyle () {
      console.log(this.direction)
      if (this.direction === 'horizontal') {
        return {width: this.slideSize + 'px', minWidth: this.slideSize + 'px'}
      }
      return {height: this.slideSize + 'px', minHeight: this.slideSize + 'px'}
    },
    slideSize () {
      if (this.direction === 'horizontal') {
        return Math.floor(this.width / this.perView)
      }
      return Math.floor(this.height / this.perView)
    },
    visible () {
      const fIndex = -this.translate / this.slideSize
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
    transform () {
      if (this.direction === 'horizontal') {
        return `translate3d(${this.translate}px, 0, 0)`
      }
      return `translate3d(0, ${this.translate}px, 0)`
    },
    minTranslate () {
      return -(this.slides.length - this.perView) * this.slideSize
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
      if (this.width - (slidesCount - this.index) * this.slideSize > 40) {
        const index = -this.minTranslate / this.slideSize
        console.log('WRONG', this.index, '->', index)
        this.setIndex(index, false)
      } else {
        this.setIndex(this.index, false)
      }
    }
  },
  created () {
    const coord = e => {
      if (this.direction === 'horizontal') {
        return e.screenX || e.touches[0].screenX
      }
      return e.screenY || e.touches[0].screenY
    }
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
        document.addEventListener('touchmove', swipe.pointermove, false)
        // document.addEventListener('dragend', swipe.end, false)
        swipe.origin.screen = coord(e)
        swipe.origin.translate = this.translate
        this.animate = false
        swipe.points = []
        // return true
      },
      end: (e) => {
        // console.log(`Swipe End (${e.type})`)
        document.removeEventListener('mousemove', swipe.pointermove)
        document.removeEventListener('touchmove', swipe.pointermove)
        this.animate = true
        // document.removeEventListener('dragend', swipe.end, false)
        if (!swipe.points || swipe.points.length < 2) {
          return
        }
        if (this.translate > 0) {
          this.translate = 0
        } else {
          const t = performance.now()
          const points = swipe.points.slice(swipe.points.findIndex(p => t - p.time < 50))
          const delta = points[points.length - 1].screen - points[0].screen
          const fIndex = -this.translate / this.slideSize
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
        const screenPos = coord(e)
        swipe.points.push({
          time: performance.now(),
          screen: screenPos
        })
        this.translate = swipe.origin.translate + screenPos - swipe.origin.screen
        if (this.translate > 0) {
          this.translate = 0
        //   swipe.origin.screen = screenPos
        }
        if (this.translate < this.minTranslate) {
          this.translate = this.minTranslate
          // swipe.origin.screen = screenPos
        }
        // if (e.touches) {
        //   e.preventDefault()
        // }
        // return true
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
      this.index = Math.max(0, Math.min(index, this.slides.length - this.perView))
      if (!animate) {
        this.animate = false
        this.resetAnimation()
      } else {
        this.visibleBefore = this.visible
      }
      this.translate = -this.slideSize * this.index
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
    scroll: throttle(function (e) {
      const step = e.deltaY < 0 ? -1 : 1
      this.setIndex(this.index + step)
    }, 30),
    updateContainerSize: debounce(function () {
      const container = this.$refs.slidesContainer ? this.$refs.slidesContainer : this.$el.children[0]
      this.width = container.clientWidth
      this.height = container.clientHeight
      this.setIndex(this.index, false)
    }, 50)
  }
}
