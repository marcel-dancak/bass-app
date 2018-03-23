<template>
  <v-app>
    <main-toolbar
      :player="player"
      :editor="editor"
      :project="project"
      @playbackChange="editorPlayer.playing ? stop() : play()"
    />
    <swiper
      v-if="project"
      ref="swiper"
      :per-view="editor.slidesPerView"
      :checkSwipeable="true"
      :items="beats"
      :loop="player.loopMode"
      @wheel.native="mouseWheel">

      <div
        slot="item"
        slot-scope="props"
        class="beat"
        :class="{first: props.item.beat === 1}">
        <beat-header
          swipeable="true"
          :beat="props.item"
          :active="editor.activeSubbeat"
        />
        <bass-beat
          class="instrument bass"
          :beat="props.item"
          :instrument="app.track.instrument.config"
          :display="app.label"
        />
      </div>
    </swiper>

    <v-toolbar class="bottom-toolbar" :dense="true">
      <v-spacer />
      <v-btn @click="prev">Prev</v-btn>
      <v-btn @click="next">Next</v-btn>
      <v-spacer />
      <v-select
        :items="labelOptions"
        v-model="app.label"
        item-text="name"
        item-value="value"
        hide-details>
      </v-select>
    </v-toolbar>

  </v-app>
</template>

<script>
import { Section } from './core/section'
import Player from './core/player'
import { PercussionInstrument, DrumKit, PercussionKit } from './core/percussion'
import StringInstrument from './core/string-instrument'

import MainToolbar from './components/MainToolbar'
import Swiper from './components/Swiper'
import BeatHeader from './components/BeatHeader'
import BassBeat from './components/BassBeat'

import data from './data/Treasure.json'
// import data from './data/TheseDays.json'
// import data from './data/AnotherDayInParadise'
// const data = {}

const NoteLabelOptions = [
  {
    name: 'Name',
    value: 'name'
  }, {
    name: 'Fret',
    value: 'fret'
  }, {
    name: 'Fret + Name',
    value: ''
  }
]

export default {
  name: 'App',
  components: {
    MainToolbar, Swiper, BeatHeader, BassBeat
  },
  data: () => ({
    player: {
      playing: false,
      loopMode: false,
    },
    editor: {
      slidesPerView: 8,
      sectionIntex: 0,
      activeSubbeat: ''
    },
    app: {
      label: 'name',
      trackId: 'bass_0',
      track: null
    },
    project: null
  }),
  computed: {
    sections () {
      return this.project.sections.map((s, i) => ({
        index: i,
        name: s.name
      }))
    },
    sectionData () {
      return this.project.sections[this.editor.sectionIntex]
    },
    beats () {
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
      return beats
    }
  },
  created () {
    this.project = data
    this.labelOptions = NoteLabelOptions

    const player = Player(new AudioContext())
    player.addTrack({
      id: 'bass_0',
      instrument: StringInstrument({
        strings: ['B', 'E', 'A', 'D', 'G']
      })
    })
    player.addTrack({
      id: 'drums_0',
      instrument: PercussionInstrument(DrumKit)
    })
    player.addTrack({
      id: 'drums_1',
      instrument: PercussionInstrument(PercussionKit)
    })
    this.app.track = player.tracks['bass_0']
    this.editorPlayer = player
  },
  beforeDestroy () {
    this.editorPlayer.context.close()
  },
  methods: {
    play () {
      if (this.editorPlayer.playing) {
        return this.stop()
      }
      const swiper = this.$refs.swiper
      this.editorPlayer.play(this.section, (e) => {
        const beat = e.section.tracks.bass_0.beat(e.bar, e.beat)
        swiper.setIndex(this.beats.indexOf(beat))
        this.highlightBeat(e)
      })
      // this.editorPlayer.export(this.section)
    },
    stop () {
      this.editorPlayer.stop()
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
      this.editor.slidesPerView += step
      this.editor.slidesPerView = Math.min(Math.max(2, this.editor.slidesPerView), this.beats.length)
    },
    highlightBeat (e) {
      const beat = e.section.tracks['bass_0'].beat(e.bar, e.beat)
      const subbeatTime = 1000 * (e.duration / beat.subdivision)
      let delay = 1000 * (e.startTime - this.editorPlayer.context.currentTime)
      for (let i = 0; i < beat.subdivision; i++) {
        setTimeout(() => {
          this.editor.activeSubbeat = `${e.bar}:${e.beat}:${i + 1}`
        }, delay)
        delay += subbeatTime
      }
    }
  }
}
</script>

<style lang="scss">
html {
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-size: 1em;
}

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

.bottom-toolbar {
  position: absolute;
  bottom: 0;
  .input-group {
    padding: 0 0.5em;
    flex: 0 0 auto;
    width: auto;
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
