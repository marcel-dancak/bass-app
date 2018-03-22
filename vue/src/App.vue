<template>
  <div id="app">
    <swiper
      ref="swiper"
      :per-view="slidesPerView"
      :checkSwipeable="true"
      :items="beats"
      :loop="loopMode"
      @wheel.native="mouseWheel">

<!--       <template
        slot="item"
        slot-scope="props">
        <div class="beat">
        <beat-header swipeable="true" :beat="props.item" />
        <div class="beat bass"></div>
        </div>
      </template> -->

      <div
        slot="item"
        slot-scope="props"
        class="beat"
        :class="{first: props.item.beat === 1}">
        <beat-header swipeable="true" :beat="props.item" :active="activeSubbeat"/>
        <bass-beat class="instrument bass" :beat="props.item" :instrument="bass" />
        <!-- <div class="beat bass"></div> -->
      </div>

    </swiper>
    <button @click="prev">Prev</button>
    <button @click="next">Next</button>
    <button @click="add">Add</button>
    <button @click="remove">Remove</button>
    <input type="checkbox" v-model="loopMode">Loop
    <button @click="play">Play</button>
  </div>
</template>

<script>
import { Section } from './core/section'
import Player from './core/player'

import Swiper from './components/Swiper'
import BeatHeader from './components/BeatHeader'
import BassBeat from './components/BassBeat'

import data from './data/Candy.json'
// import data from './data/TheseDays.json'

export default {
  name: 'App',
  components: {
    Swiper, BeatHeader, BassBeat
  },
  data: () => ({
    slidesPerView: 8,
    loopMode: false,
    activeSubbeat: '',
    beats: null,
    // beats: data.sections[0].tracks.bass_0,
    bass: {
      strings: ['E', 'A', 'D', 'G']
    }
  }),
  created () {
    const sectionData = data.sections[0]
    const section = Section(sectionData)
    section.addBass('bass_0', sectionData.tracks.bass_0)
    // this.beats = section.tracks.bass_0.data
    const beats = []
    section.tracks.bass_0.forEachBeat(beat => { beats.push(beat) })
    this.beats = beats
    this.player = Player(new AudioContext())
    this.player.addTrack({
      id: 'bass_0',
      instrument: {},
      audio: {}
    })
    this.section = section
    window.t = this
  },
  methods: {
    play () {
      if (this.player.playing) {
        return this.stop()
      }
      const swiper = this.$refs.swiper
      this.player.play(this.section, (e) => {
        const beat = e.section.tracks.bass_0.beat(e.bar, e.beat)
        swiper.setIndex(this.beats.indexOf(beat))
        this.highlightBeat(e)
      })
      // this.player.export(this.section)
    },
    stop () {
      this.player.stop()
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
    add () {
      this.beats.push({
        bar: 7,
        beat: 1,
        subdivision: 3
      })
    },
    remove () {
      this.beats.pop()
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
      let delay = 1000 * (e.startTime - this.player.context.currentTime)
      for (let i = 0; i < beat.subdivision; i++) {
        setTimeout(() => {
          this.activeSubbeat = `${e.bar}:${e.beat}:${i + 1}`
        }, delay)
        delay += subbeatTime
      }
    }
  }
}
</script>

<style lang="scss">
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}

.swiper {
  xbackground-color: #f7f7f7;
  padding: 1em;
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
