<template>
  <v-app @contextmenu.native.prevent>
    <main-toolbar
      :app="$data"
      @playbackChange="audioPlayer.playing ? stop() : play()"
    />

    <editor
      v-if="mode === 'editor'"
      :app="$data"
      :sectionData="sectionData"></editor>

    <v-toolbar class="bottom-toolbar" :dense="true">
      <v-spacer />
      <v-btn @click="prev">Prev</v-btn>
      <v-btn @click="next">Next</v-btn>
      <v-spacer />
      <v-select
        :items="labelOptions"
        v-model="label"
        item-text="name"
        item-value="value"
        hide-details>
      </v-select>
    </v-toolbar>

  </v-app>
</template>

<script>
import Vue from 'vue'
import Player from './core/player'
import { PercussionInstrument, DrumKit, PercussionKit } from './core/percussion'
import StringInstrument from './core/string-instrument'

import MainToolbar from './components/MainToolbar'
import Editor from './components/Editor'
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
    MainToolbar, Editor
  },
  provide: {
    '$player': null
  },
  data: () => ({
    player: {
      playing: false,
      loopMode: false,
      loading: false,
      countdown: false,
      screenLock: false
    },
    editor: {
      sectionIndex: 0
    },
    mode: 'editor',
    label: 'name',
    trackId: 'bass_0',
    track: null,
    project: null
  }),
  created () {
    this.$root.constructor.prototype.$bus = new Vue()

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
    this.track = player.tracks['bass_0']
    this.audioPlayer = player
    this._provided.$player = player
  },
  computed: {
    sectionData () {
      return this.project.sections[this.editor.sectionIndex]
    }
  },
  beforeDestroy () {
    this.audioPlayer.context.close()
  },
  methods: {
    prev () {
      const swiper = this.$refs.swiper
      if (swiper.index) {
        swiper.setIndex(swiper.index - 1)
      }
    },
    next () {
      const swiper = this.$refs.swiper
      swiper.setIndex(swiper.index + 1)
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

.bottom-toolbar {
  position: absolute;
  bottom: 0;
  .input-group {
    padding: 0 0.5em;
    flex: 0 0 auto;
    width: auto;
  }
}
</style>
