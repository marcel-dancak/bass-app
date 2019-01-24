<template>
  <v-app @contextmenu.native.prevent>
    <div class="flex layout column" @contextmenu.prevent>
      <main-toolbar
        :app="$data"
        @playbackChange="audioPlayer.playing ? stop() : play()"
      />
      <editor
        v-if="mode === 'editor' && section"
        :app="$data"
        :section="section">
      </editor>

      <viewer
        v-if="mode === 'viewer'&& viewer.playlist"
        :app="$data"
        :playlist="viewer.playlist">
      </viewer>

      <v-toolbar class="bottom-toolbar" :height="-1">
        <v-spacer />
        <v-select
          :items="labelOptions"
          v-model="label"
          item-text="name"
          item-value="value"
          hide-details>
        </v-select>
      </v-toolbar>
    </div>
  </v-app>
</template>

<script>
import Vue from 'vue'
import Player from './core/player'
import Project from './core/project'
import { Section } from './core/section'
import { PercussionInstrument, DrumKit, PercussionKit } from './core/percussion'
import StringInstrument from './core/string-instrument'
import Piano from './core/piano'

import MainToolbar from './components/toolbar/MainToolbar'
import Editor from './components/Editor'
import Viewer from './components/Viewer'
import data from './data/Treasure.json'
// import data from './data/TheseDays.json'
// import data from './data/AnotherDayInParadise'
// const data = {}


const shared = {
  player: {playing: false}
}

shared.install = function (Vue, options) {
  // Object.defineProperty(Vue.prototype, '$test', {
  //   get () { return shared }
  // })

  Vue.mixin({
    beforeCreate () {
      this.$test = shared
      if (this.$options.context) {
        const variable = this.$options.context[0]
        let parent = this.$parent
        let i = 0
        // while (parent !== this.$root)
        while (i++ < 50) {
          if (parent.$data[variable] !== undefined) {
            console.log('watch ', variable)
            parent.$watch(variable, (n, o) => {
              console.log('updated', n)
            })
          }
          if (parent === this.$root) {
            break
          }
          parent = parent.$parent
        }
      }
    }
  })
}

// Vue.use(shared)

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
    MainToolbar, Editor, Viewer
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
      screenLock: false,
      bpm: 80
    },
    editor: {
      sectionIndex: null,
      section: null
    },
    viewer: {
      playlistIndex: null,
      playlist: null,
      playlistEditor: false
    },
    mode: 'editor',
    label: 'name',
    track: null,
    project: null,
    aplayer: null
  }),
  computed: {
    section () {
      if (this.editor.sectionIndex !== null) {
        console.log('Create Section')
        return Section(this.project.getSectionData(this.editor.sectionIndex))
      }
    }
  },
  watch: {
    project () {
      this.editor.sectionIndex = this.project.sections[0].id
      if (this.project.playlists.length) {
        this.viewer.playlist = this.project.playlists[0]
      }
      this.track = this.project.tracks[0]
    },
    section (section) {
      console.log('Update Section reference')
      this.editor.section = section
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
@import './transitions';

html {
  overflow: hidden!important;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-size: 1em!important;
  height: 100%;
  body {
    height: 100%;
  }
}
.application.theme--light {
  background: none;
}
#app {
  height: 100%;
  position: relative;
  .application--wrap {
    height: 100%;
  }
}

.bottom-toolbar {
  border-top: 1px solid #bbb;

  .toolbar__content {
    height: 2.5em;
    background-color: #ccc;
  }

  .input-group {
    padding: 0 0.5em;
    flex: 0 0 auto;
    width: auto;
  }
}
</style>
