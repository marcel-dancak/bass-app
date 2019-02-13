<template>
  <div class="editor">
    <swiper
      v-if="$section"
      ref="swiper"
      :per-view="slidesPerView"
      :checkSwipeable="true"
      :items="beats"
      :loop="app.player.loopMode"
      @wheel.native="mouseWheel"
    >
      <template slot="header-panel">
        <div class="mask top"/>
        <div class="mask bottom"/>
        <v-menu
          class="section"
          content-class="section"
          :close-on-content-click="false"
          :min-width="200">
          <div
            slot="activator"
            class="layout column">
            <span>{{ timeSignature.top }}</span>
            <span>{{ timeSignature.bottom }}</span>
          </div>
          <div class="section-preferences">
            <div class="layout row align-end">
              <v-text-field
                label="Time Signature"
                type="number"
                min="1"
                max="12"
                hide-details
                :value="timeSignature.top"
                @input="$section.setTimeSignature($event, timeSignature.bottom)"
              />
              <span class="px-2">/</span>
              <v-select
                label=""
                hide-details
                :items="[2, 4, 8, 16]"
                :value="timeSignature.bottom"
                @input="$section.setTimeSignature(timeSignature.top, $event)"
              />
            </div>
            <v-text-field
              label="Number of bars"
              type="number"
              min="1"
              max="24"
              hide-details
            />
          </div>
        </v-menu>
      </template>

      <div
        slot="header"
        slot-scope="props"
        class="beat"
        swipeable
        :class="{first: props.item.beat === 1}">
        <beat-header
          :beat="props.item"
          :active="activeSubbeat"
          @contextmenu.native="beatContextMenu($event, props.item)"
          @xcontextmenu.native="showBeatMenu=true"
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

      <fretboard
        slot="bottom"
        v-if="app.track.type === 'bass'"
        :instrument="app.track"
      />
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
      <div
        slot="instrument"
        :is="instrumentComponent"
        :instrument="app.track"
      />
    </swiper>
    <mouse-selector @selected="mouseSelection"/>
    <context-menu ref="contextMenu" />
  </div>
</template>

<script>
import Vue from 'vue'
import BassEditor from '../core/bass-editor'
import DrumEditor from '../core/drum-editor'
import PianoEditor from '../core/piano-editor'
// import Swiper from './swiper/Swiper'
import Swiper from './swiper/DualSwiper'

import MouseSelector from './MouseSelector'
import BeatHeader from './BeatHeader'
import BassBeat from './BassBeat'
import BassSoundForm from './BassSoundForm'
import BassStrings from './BassStrings'
import Fretboard from './Fretboard'
import Keyboard from './Keyboard'
import DrumBeat from './DrumBeat'
import Drums from './Drums'
import PianoBeat from './PianoBeat'
import ContextMenu from '../ui/ContextMenu'
import BeatMenu from './BeatMenu'
import { Section } from '@/core/section'


Vue.directive('bind-el', {
  bind (el, binding) {
    Object.defineProperty(binding.value, 'elem', { value: el, configurable: true })
  }
})

const BeatComponents = {
  bass: 'bass-beat',
  drums: 'drum-beat',
  piano: 'piano-beat'
}
const InstrumentComponents = {
  bass: 'bass-strings',
  drums: 'drums',
  piano: 'keyboard'
}
export default {
  name: 'editor',
  components: {
    Swiper, MouseSelector, BeatHeader, ContextMenu,
    BassBeat, BassSoundForm, BassStrings, Fretboard,
    DrumBeat, Drums, PianoBeat, Keyboard,
    BeatMenu
  },
  context: ['aplayer'],
  data () {
    return {
      slidesPerView: 8,
      activeSubbeat: ''
    }
  },
  computed: {
    app () {
      return this.$store
    },
    $project () {
      return this.$service('project')
    },
    $section () {
      if (this.app.editor.sectionIndex !== null) {
        const section = Section(this.$project.getSectionData(this.app.editor.sectionIndex))
        return this.$createService(section, 'section', ['bpm', 'timeSignature'])
      }
      return null
    },
    timeSignature () {
      return this.$section.timeSignature
    },
    instrumentComponent () {
      return InstrumentComponents[this.app.track.type]
    },
    beatComponent () {
      return BeatComponents[this.app.track.type]
    },
    beats () {
      let sectionTrack = this.$section.tracks[this.app.track.id]
      if (!sectionTrack) {
        sectionTrack = this.$section.addTrack(this.app.track.id, [])
        // Vue.util.defineReactive(sectionTrack, 'beats')
      }
      Vue.util.defineReactive(sectionTrack, 'beats')
      // console.log(sectionTrack.beats)
      return sectionTrack.beats
    },
    trackEditor () {
      const track = this.app.track
      let editor = this.editors[track.id]
      if (!editor) {
        const Editor = {
          bass: BassEditor,
          drums: DrumEditor,
          piano: PianoEditor
        }[track.type]
        editor = Editor(track)
        this.editors[track.id] = editor
        Vue.util.defineReactive(editor, 'selection')
        Vue.util.defineReactive(editor, 'draggedSounds')
        Vue.util.defineReactive(editor, 'dragCopy')
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
    async play () {
      if (this.$player.playing) {
        return this.stop()
      }

      const swiper = this.$refs.swiper

      const resources = this.$player.collectResources(this.$section)
      await this.$player.fetchResources(resources)

      let lastBeat = null
      this.$player.playStream(
        // next beat playback
        (startTime) => {
          let isOnEnd = false

          if (lastBeat && this.app.player.screenLock) {
            let endIndex = swiper.index + this.slidesPerView - 1
            if (endIndex >= this.beats.length) {
              endIndex -= this.beats.length
            }
            const endBeat = this.beats[endIndex]
            isOnEnd = (lastBeat.bar === endBeat.bar && lastBeat.beat === endBeat.beat)
          }
          if (!lastBeat || (isOnEnd && this.app.player.loopMode)) {
            const startBeat = this.beats[swiper.index]
            return {
              section: this.$section,
              bar: startBeat.bar,
              beat: startBeat.beat
            }
          } else if (!isOnEnd) {
            let { bar, beat } = lastBeat
            beat++
            if (beat > this.timeSignature.top) {
              beat = 1
              bar++
              if (bar > this.$section.length) {
                bar = 1
              }
            }
            return { section: this.$section, bar, beat }
          }
        },
        // beat prepared callback
        e => {
          this.highlightBeat(e)
          if (!this.app.player.screenLock) {
            const beat = e.section.tracks[this.app.track.id].beat(e.bar, e.beat)
            let nextIndex = this.beats.indexOf(beat)
            if (this.app.player.loopMode && nextIndex < swiper.index) {
              nextIndex += this.beats.length
            }
            swiper.setIndex(nextIndex)
          }
          lastBeat = e
        }
      )
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
    mouseWheel (e) {
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
          sounds.push(...indexes.map(i => beatComp.$props.beat.data[i]))
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
      const bounds = e.currentTarget.getBoundingClientRect()
      const opts = { x: bounds.left, y: bounds.bottom + 2 }
      this.$refs.contextMenu.open(e, BassSoundForm, props, opts)
    },
    beatContextMenu (e, beat) {
      this.$refs.contextMenu.open(e, BeatMenu, { beat })
    }
  }
}
</script>

<style lang="scss">
@import "borders.scss";

.editor {
  display: flex;
  flex-direction: column;
  flex: 1;

  .swiper {
    display: flex;
    flex-direction: column;
    padding-right: 0.5em;
    margin: 2em 0 0.5em 0.5em;

    .slides-container {
      padding: 0 2px;
    }
    .beat {
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
  .header-panel {
    position: relative;
    .mask {
      background-color: #fff;
      position: absolute;
      left: 0;
      &.top {
        top: 0;
        height: 1.5em;
        right: 10px;
      }
      &.bottom {
        top: 1.5em;
        bottom: 0;
        right: 0;
      }
    }
  }
  .menu.section {
    margin-top: 1.5em;
    width: 100%;
    .menu__activator {
      line-height: 1.5em;
      span {
        font-size: 1.25em;
        font-weight: 500;
        text-align: center;
      }
    }
  }
}

.menu__content.section {
  background-color: #fff;
  padding: 0.5em 1em;
}

.drag-container {
  position: fixed;
  pointer-events: none;
  opacity: 0.75;
  .effect {
    position: absolute;
    left: 0;
    top: -1.25em;
    width: 1em;
    height: 1em;
    line-height: 1em;
    border-radius: 50%;
    color: #fff;
    background-color: #333;
    text-align: center;
  }
}
</style>
