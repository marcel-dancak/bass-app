<template>
  <v-app @contextmenu.native.prevent>
    <div class="flex layout column" @contextmenu.prevent>
      <main-toolbar v-if="$player"/>

      <editor v-if="app.mode === 'editor'"/>
      <viewer v-else/>

      <v-toolbar class="bottom-toolbar" :height="-1">
        <v-select
          :items="songs"
          v-model="song"
          item-text="name"
          item-value="name"
          hide-details
        />
        <v-spacer/>
        <v-select
          :items="labelOptions"
          v-model="app.label"
          item-text="name"
          item-value="value"
          hide-details
        />
      </v-toolbar>
    </div>
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
import Viewer from './components/Viewer'

import data from './data/Treasure.json'
import data2 from './data/TheseDays.json'
import data3 from './data/AnotherDayInParadise'
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
    MainToolbar, Editor, Viewer
  },
  data () {
    return {
      song: 'Treasure'
    }
  },
  computed: {
    app () {
      return this.$store
    },
    songs () {
      return [
        { name: 'Treasure', data: data },
        { name: 'These Days', data: data2 },
        { name: 'Another Day In Paradise', data: data3 }
      ]
    },
    $project () {
      return this.$service('project')
    },
    $player () {
      return this.$service('player')
    }
  },
  watch: {
    $project: {
      // immediate: true,
      handler (project, old) {
        // console.log('$project wacher', project === old)
        if (project === old) {
          console.log('same project, skipping')
          return
        }
        if (!project) {
          return
        }
        this.app.editor.sectionIndex = project.sections[0].id
        if (project.playlists.length) {
          this.app.viewer.playlist = project.playlists[0]
          // Vue.set(this.app.viewer, 'playlist', project.playlists[0])
        }
        this.app.track = project.tracks[0]
        if (this.$player && this.$player.context) {
          try {
            // this.$player.context.close()
          } catch (ex) {}
        }
        const player = this.createPlayer(project)
        this.$createService(player, 'player')
        Vue.prototype.$player = player
      }
    },
    song: {
      immediate: true,
      handler (song) {
        const data = JSON.parse(JSON.stringify(this.songs.find(s => s.name === song).data))
        this.$createService(Project(data), 'project')
      }
    }
  },
  created () {
    this.$root.constructor.prototype.$bus = new Vue()
    this.labelOptions = NoteLabelOptions
    // this.constructor.prototype.$player = player
  },
  beforeDestroy () {
    this.$player.context.close()
  },
  methods: {
    createPlayer (project) {
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
        instrument: Piano({ preset: 'electric' }) // acoustic electric
      })
      player.addTrack({
        id: 'piano_1',
        instrument: Piano({ preset: 'acoustic' })
      })
      player.tracks.piano_0.audio.gain.value = project.track('piano_0').volume.value
      return player
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
.menu__content--select {
  .icon {
    color: inherit!important;
    fill: currentColor;
    width: 0.875em;
    height: 0.875em;
  }
}
</style>
