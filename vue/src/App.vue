<template>
  <v-app @contextmenu.native.prevent>
    <main-toolbar
      :app="$data"
      @playbackChange="audioPlayer.playing ? stop() : play()"
    />

    <editor
      v-if="mode === 'editor' && sectionData"
      :app="$data"
      :sectionData="sectionData">
    </editor>

    <v-toolbar class="bottom-toolbar" :dense="true">
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
import Project from './core/project'
import { PercussionInstrument, DrumKit, PercussionKit } from './core/percussion'
import StringInstrument from './core/string-instrument'

import MainToolbar from './components/MainToolbar'
import Editor from './components/Editor'
import data from './data/Treasure.json'
// import data2 from './data/TheseDays.json'
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
      sectionIndex: null
    },
    mode: 'editor',
    label: 'name',
    trackId: 'bass_0',
    track: null,
    project: null
  }),
  computed: {
    sectionData () {
      return this.project.getSectionData(this.editor.sectionIndex)
    }
  },
  watch: {
    project () {
      this.editor.sectionIndex = this.project.sections[0].id
    }
  },
  created () {
    this.project = Project(data)
    // setTimeout(() => {this.project = Project(data2) }, 5000)

    this.$root.constructor.prototype.$bus = new Vue()
    this.labelOptions = NoteLabelOptions

    const player = Player(new AudioContext())
    player.addTrack({
      id: 'bass_0',
      instrument: StringInstrument({
        strings: ['E', 'A', 'D', 'G']
        // strings: ['B', 'E', 'A', 'D', 'G']
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
