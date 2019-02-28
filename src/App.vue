<template>
  <v-app @contextmenu.native.prevent>
    <div class="flex layout column" @contextmenu.prevent>
      <main-toolbar v-if="$player"/>
      <editor v-if="app.mode === 'editor'"/>
      <viewer v-else/>
      <v-toolbar
        v-if="app.env.desktop"
        class="bottom-toolbar"
        :height="-1"
      >
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
import Player from '@/core/player'
import Project from '@/core/project'
import { LocalProject } from '@/core/project'
import ProjectStorage from '@/core/local-storage'
import { PercussionInstrument, DrumKit, PercussionKit } from '@/core/percussion'
import StringInstrument from '@/core/string-instrument'
import Piano from '@/core/piano'

import MainToolbar from './components/toolbar/MainToolbar'
import Editor from './components/Editor'
import Viewer from './components/Viewer'


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
  computed: {
    app () {
      return this.$store
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
        this.app.editor.sectionIndex = project.index[0].id
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
    }
  },
  created () {
    this.$root.constructor.prototype.$bus = new Vue()
    this.labelOptions = NoteLabelOptions
    this.$bus.$on('newProject', this.newProject)

    const lastProject = ProjectStorage.projectsList()[0]
    if (lastProject) {
      this.$createService(LocalProject(6), 'project')
    } else {
      this.newProject()
    }
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
      project.tracks.forEach(track => {
        let instrument
        if (track.type === 'bass') {
          instrument = StringInstrument({ strings: track.strings.split('') })
        } else if (track.type === 'drums') {
          const kit = track.kit === 'Drums' ? DrumKit : PercussionKit
          instrument = PercussionInstrument(kit)
        } else if (track.type === 'piano') {
          instrument = Piano({ preset: track.preset })
        }
        player.addTrack({
          id: track.id,
          instrument
        })
        player.tracks[track.id].audio.gain.value = track.volume.muted ? 0.0001 : track.volume.value
      })
      if (project.audioTrack) {
        player.addAudioTrack(project.audioTrack)
      }
      return player
    },
    newProject () {
      const data = {
        name: '',
        index: [],
        tracks: [
          {
            type: 'bass',
            volume: {
              muted: false,
              value: 5.65
            },
            name: 'Bass',
            strings: 'EADG',
            tuning: [0, 0, 0, 0],
            muted: false,
            solo: true
          }, {
            type: 'drums',
            volume: {
              muted: false,
              value: 1
            },
            kit: 'Drums',
            name: 'Drums',
            solo: false
          }
        ],
        sections: [],
        playlists: []
      }
      const project = Project(data)
      project.addSection({
        name: 'New Section',
        bpm: 80,
        timeSignature: {
          top: 4,
          bottom: 4
        },
        length: 2
      })
      this.$createService(project, 'project')
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

@media (max-height: 720px) {
  html {
    font-size: 0.8335em!important;
  }
}
@media (max-height: 600px) {
  html {
    font-size: 0.7em!important;
  }
}
</style>
