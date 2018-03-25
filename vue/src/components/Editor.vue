<template>
  <div class="editor">
    <swiper
      ref="swiper"
      :per-view="slidesPerView"
      :checkSwipeable="true"
      :items="beats"
      :loop="app.player.loopMode"
      @wheel.native="mouseWheel">

      <div
        slot="item"
        slot-scope="props"
        class="beat"
        :class="{first: props.item.beat === 1}">
        <beat-header
          swipeable
          :beat="props.item"
          :active="activeSubbeat"
        />
        <bass-beat
          class="instrument bass"
          :beat="props.item"
          :editor="trackEditor"
          :instrument="app.track.instrument.config"
          :display="app.label"
        />
      </div>
    </swiper>
    <mouse-selector @selected="mouseSelection"/>
  </div>
</template>

<script>
import { Section } from '../core/section'
import Swiper from './Swiper'
import MouseSelector from './MouseSelector'
import BeatHeader from './BeatHeader'
import BassBeat from './BassBeat'

const bassEditor = {
  selection: [],
  select (e, sound) {
    if (e.ctrlKey) {
      const index = this.selection.indexOf(sound)
      if (index === -1) {
        this.selection.push(sound)
      } else {
        this.selection.splice(index, 1)
      }
    } else {
      this.selection = [sound]
    }
  }
}

export default {
  name: 'editor',
  components: {
    Swiper, MouseSelector, BeatHeader, BassBeat
  },
  inject: ['$player'],
  props: ['app', 'sectionData'],
  data: () => ({
    slidesPerView: 8,
    activeSubbeat: '',
    trackEditor: null,
    selectionRect: null
  }),
  computed: {
    beats () {
      if (!this.sectionData) return []

      const sectionData = this.sectionData
      const section = Section(sectionData)
      section.addBass('bass_0', sectionData.tracks.bass_0)
      section.addDrum('drums_0', sectionData.tracks.drums_0)
      if (sectionData.tracks.drums_1) {
        section.addDrum('drums_1', sectionData.tracks.drums_1)
      }
      this.section = section
      const beats = []
      section.tracks[this.app.trackId].forEachBeat(beat => { beats.push(beat) })
      this.trackEditor = bassEditor
      return beats
    }
  },
  created () {
    this.$bus.$on('playbackChange', this.play)
    this.$bus.$on('playerBack', this.seekToStart)
  },
  beforeDestroy () {
    this.$bus.$off('playbackChange', this.play)
    this.$bus.$off('playerBack', this.seekToStart)
  },
  methods: {
    play () {
      if (this.$player.playing) {
        return this.stop()
      }
      const swiper = this.$refs.swiper
      this.$player.play(this.section, (e) => {
        const beat = e.section.tracks.bass_0.beat(e.bar, e.beat)
        swiper.setIndex(this.beats.indexOf(beat))
        this.highlightBeat(e)
      })
      // this.$player.export(this.section)
    },
    stop () {
      this.$player.stop()
    },
    seekToStart () {
      if (this.$player.playing) {
        this.stop()
        this.play()
      }
      this.$refs.swiper.setIndex(0)
    },
    prev () {
      const swiper = this.$refs.swiper
      if (swiper.index) {
        swiper.setIndex(swiper.index - 1)
      }
    },
    next () {
      const swiper = this.$refs.swiper
      swiper.setIndex(swiper.index + 1)
    },
    mouseWheel (e) {
      // console.log(e)
      const step = e.deltaY > 0 ? -1 : 1
      this.slidesPerView += step
      this.slidesPerView = Math.min(Math.max(2, this.slidesPerView), this.beats.length)
    },
    highlightBeat (e) {
      const beat = e.section.tracks['bass_0'].beat(e.bar, e.beat)
      const subbeatTime = 1000 * (e.duration / beat.subdivision)
      let delay = 1000 * (e.startTime - this.$player.context.currentTime)
      for (let i = 0; i < beat.subdivision; i++) {
        setTimeout(() => {
          this.activeSubbeat = `${e.bar}:${e.beat}:${i + 1}`
        }, delay)
        delay += subbeatTime
      }
    },
    mouseSelection (evt) {
      const { x1, y1, x2, y2 } = evt
      const sounds = []
      this.$refs.swiper.$children.forEach(slide => {
        const beatComp = slide.$children[1]
        const indexes = []
        if (beatComp && beatComp.$refs && beatComp.$refs.sound) {
          beatComp.$refs.sound.forEach((el, i) => {
            const bounds = el.getBoundingClientRect()
            if (bounds.left >= x1 && bounds.right <= x2 && bounds.top >= y1 && bounds.bottom <= y2) {
              indexes.push(i)
            }
          })
          Array.prototype.push.apply(sounds, indexes.map(i => beatComp.$props.beat.data[i]))
        }
      })
      this.trackEditor.selection = sounds
    }
  }
}
</script>

<style lang="scss">

.editor {
  .swiper {
    padding: 1em;
    .beat {
      text-align: center;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      .beat-header {
        padding-bottom: 2em;
        margin-bottom: 1em;
      }
      .instrument {
        flex: 1;
      }
    }
  }
}
/*** Borders ***/

.beat {
  .instrument, .beat-header {
    &:before {
      content: "";
      position: absolute;
      background-color: #aaa;
      top: 0;
      bottom: 0;
      left: 0;
      width: 1px;
      z-index: 1;
    }
  }
  .beat-header:before {
    height: 70%;
    width: 2px;
  }
  &.first {
    .beat-header:before, .instrument:before {
      width: 3px;
      left: -1px;
    }
  }
  &:last-of-type, &.last {
    .beat-header:after, .instrument:after {
      content: "";
      position: absolute;
      right: 0;
      top: 0;
      width: 1px;
      border: solid #aaa;
      border-width: 0 2px;
    }
    .beat-header:after {
      height: 70%;
    }
    .instrument:after {
      bottom: 0;
    }
  }
}
</style>
