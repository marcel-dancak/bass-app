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
import Piano from './core/piano'

import MainToolbar from './components/toolbar/MainToolbar'
import Editor from './components/Editor'
// import data from './data/Treasure.json'
import data from './data/TheseDays.json'
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
      this.track = this.project.tracks[0]
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
    player.addTrack({
      id: 'piano_0',
      instrument: Piano({preset: 'electric'}) // acoustic electric
    })
    player.addTrack({
      id: 'piano_1',
      instrument: Piano({preset: 'acoustic'})
    })
    player.tracks.piano_0.audio.gain.value = this.project.track('piano_0').volume.value
    this.audioPlayer = player
    this._provided.$player = player
    setTimeout(() => {
      console.log('set $player')
      this.aplayer = player
    }, 20)

    // this.constructor.prototype.$player = player
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
  height: 100%;
  body {
    height: 100%;
  }
}

#app {
  height: 100%;
  position: relative;
  .application--wrap {
    xheight: 100%;
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
</style>
