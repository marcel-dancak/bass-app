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
        slot="header"
        slot-scope="props"
        class="beat"
        swipeable
        :class="{first: props.item.beat === 1}">
        <beat-header
          :beat="props.item"
          :active="activeSubbeat"
        />
      </div>

      <div
        slot="content"
        slot-scope="props"
        class="beat"
        :class="{first: props.item.beat === 1}">
        <div
          :is="beatComponent"
          class="instrument"
          :beat="props.item"
          :editor="trackEditor"
          :instrument="app.track"
          :display="app.label"
          @contextmenu="soundContextMenu"
        />
      </div>

<!--       <div
        slot="item"
        slot-scope="props"
        class="beat"
        :class="{first: props.item.beat === 1}">
        <beat-header
          swipeable
          :beat="props.item"
          :active="activeSubbeat"
        />
        <div
          :is="beatComponent"
          class="instrument"
          :beat="props.item"
          :editor="trackEditor"
          :instrument="app.track"
          :display="app.label"
          @contextmenu="soundContextMenu"
        />
      </div> -->

    </swiper>
    <fretboard v-if="app.track.type === 'bass'" :instrument="app.track" />
    <mouse-selector @selected="mouseSelection"/>
    <context-menu ref="contextMenu" />
  </div>
</template>

<script>
import Vue from 'vue'
import { Section } from '../core/section'
import BassEditor from '../core/bass-editor'
import DrumEditor from '../core/drum-editor'
import PianoEditor from '../core/piano-editor'
// import Swiper from './swiper/Swiper'
import Swiper from './swiper/DualSwiper'

import MouseSelector from './MouseSelector'
import BeatHeader from './BeatHeader'
import BassBeat from './BassBeat'
import BassSoundForm from './BassSoundForm'
import Fretboard from './Fretboard'
import DrumBeat from './DrumBeat'
import ContextMenu from '../ui/ContextMenu'

Vue.directive('bind-el', {
  bind (el, binding) {
    Object.defineProperty(binding.value, 'elem', {value: el, configurable: true})
  }
})

export default {
  name: 'editor',
  components: {
    Swiper, MouseSelector, BeatHeader, ContextMenu,
    BassBeat, BassSoundForm, Fretboard,
    DrumBeat,  PianoBeat
  },
  inject: ['$player'],
  props: ['app', 'sectionData'],
  data: () => ({
    slidesPerView: 8,
    activeSubbeat: ''
  }),
  computed: {
    section () {
      const data = this.sectionData
      const section = Section(data)
      section.addBass('bass_0', data.tracks.bass_0)
      section.addDrum('drums_0', data.tracks.drums_0)
      if (data.tracks.drums_1) {
        section.addDrum('drums_1', data.tracks.drums_1)
      }
      return section
    },
    beatComponent () {
      return {
        bass: 'bass-beat',
        drums: 'drum-beat'
      }[this.app.track.type]
    },
    beats () {
      // ensure reactivity like if was normal data (not computed property only)
      Vue.util.defineReactive(this.section.tracks[this.app.track.id], 'beats')
      return this.section.tracks[this.app.track.id].beats
    },
    trackEditor () {
      const track = this.app.track
      let editor = this.editors[track.id]
      if (!editor) {
        editor = track.type === 'bass'
          ? BassEditor(track)
          : DrumEditor(track)
        this.editors[track.id] = editor
        Vue.util.defineReactive(editor, 'selection')
        Vue.util.defineReactive(editor, 'draggedSounds')
      }
      return editor
    }
  },
  created () {
    this.editors = {}
    this.$bus.$on('playbackChange', this.play)
    this.$bus.$on('playerBack', this.seekToStart)
    document.addEventListener('keydown', this.keyDown)
  },
  beforeDestroy () {
    this.$bus.$off('playbackChange', this.play)
    this.$bus.$off('playerBack', this.seekToStart)
    document.removeEventListener('keydown', this.keyDown)
  },
  methods: {
    play () {
      if (this.$player.playing) {
        return this.stop()
      }
      const swiper = this.$refs.swiper

      const startBeat = this.beats[swiper.index]
      const start = {
        bar: startBeat.bar,
        beat: startBeat.beat
      }
      this.$player.play(this.section, (e) => {
        if (!this.app.player.screenLock) {
          const beat = e.section.tracks[this.app.track.id].beat(e.bar, e.beat)
          swiper.setIndex(this.beats.indexOf(beat))
        }
        this.highlightBeat(e)
      }, { start })
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
      const beat = e.section.tracks[this.app.track.id].beat(e.bar, e.beat)
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
      // const slides = this.$refs.swiper.$children
      const slides = this.$refs.swiper.$refs.slides
      slides.forEach(slide => {
        const beatComp = slide.$children[0] // [1] for simple swiper
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
    },
    keyDown (evt) {
      if (evt.target.tagName === 'INPUT' || evt.target.hasAttribute('contenteditable')) {
        return
      }
      this.trackEditor.keyDown(evt)
    },
    soundContextMenu (e, sound) {
      this.trackEditor.select({}, sound)
      const props = {
        sound,
        editor: this.trackEditor
      }
      this.$refs.contextMenu.open(e, BassSoundForm, props)
    }
  }
}
</script>

<style lang="scss">

.editor {
  display: flex;
  flex-direction: column;
  flex: 1;

  .swiper {
    display: flex;
    flex-direction: column;
    padding: 1em;

    .slides-container {
      padding: 0 2px;
    }
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

.drag-container {
  position: fixed;
  pointer-events: none;
  opacity: 0.75;
  .icon {
    position: absolute;
    left: -0.5em;
    top: -1.25em;
    width: 1em;
    height: 1em;
    border-radius: 50%;
    border: 2px solid #999;
    background-color: rgba(255,255,255,0.75);
    padding: 0.15em;
  }
}

/*** Borders ***/

.beat {
  .instrument, .beat-header {
    &:before {
      content: "";
      position: absolute;
      background-color: #aaa;
      pointer-events: none;
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
