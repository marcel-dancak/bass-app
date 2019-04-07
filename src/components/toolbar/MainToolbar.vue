<template>
  <v-toolbar
    dark
    color="blue-grey darken-2"
    class="main-toolbar elevation-3"
    :height="-1"
  >
    <v-select
      label="Track"
      class="tracks"
      :items="$project.tracks"
      v-model="app.track"
      item-text="name"
      return-object
      content-class="tracks"
      hide-details
    >
      <template
        slot="selection"
        slot-scope="data">
        <icon :name="tracksIcons[data.item.id]"/>
        <span class="input-group__selections__comma">{{ data.item.name }}</span>
      </template>
      <template
        slot="item"
        slot-scope="data">
        <icon :name="tracksIcons[data.item.id]"/>
        <span class="input-group__selections__comma">{{ data.item.name }}</span>
      </template>
    </v-select>

    <dock-menu content-class="audio-preferences">
      <v-btn icon slot="activator">
        <icon name="volume-medium"/>
      </v-btn>
      <audio-preferences/>
    </dock-menu>

    <v-spacer/>

    <div class="player">
      <player-bg/>
      <v-text-field
        v-if="$section"
        class="bpm-field ml-1"
        v-model="$section.bpm"
        label="Speed"
        type="number"
        min="30"
        max="300"
        suffix="bpm"
      />
      <v-btn
        icon
        class="play"
        @click="togglePlayback()"
      >
        <icon :name="$player && $player.playing ? 'pause' : 'play'"/>
      </v-btn>

      <v-btn
        icon
        class="separated"
        @click="$bus.$emit('playerBack')"
      >
        <icon name="back"/>
      </v-btn>

      <v-btn
        icon
        class="separated"
        :class="{'primary--text': app.player.countdown}"
        @click="app.player.countdown = !app.player.countdown"
      >
        <icon name="countdown" />
      </v-btn>

      <!-- <icon class="toggle" name="countdown" /> -->

      <v-btn
        icon
        class="separated"
        :class="{'primary--text': app.player.loopMode}"
        @click="app.player.loopMode = !app.player.loopMode"
      >
        <icon name="loop"/>
      </v-btn>

      <v-btn
        icon
        class="separated"
        :class="{'primary--text': app.player.screenLock}"
        @click="app.player.screenLock = !app.player.screenLock">
        <icon name="screen-playback" />
      </v-btn>
    </div>

    <v-spacer/>

    <template v-if="app.env.desktop">
      <div class="mode-switch layout shrink">
        <label>Mode</label>
        <v-btn
          icon
          :class="{'primary--text': app.mode === 'editor'}"
          @click="app.mode = 'editor'"
        >
          <icon name="section-mode"/>
        </v-btn>
        <v-btn
          icon
          :class="{'primary--text': app.mode === 'viewer'}"
          @click="app.mode = 'viewer'"
        >
          <icon name="playlist-mode" />
        </v-btn>
      </div>

      <template v-if="app.mode === 'editor' && sectionId">
        <select-edit
          label="Section"
          :items="sectionsItems"
          item-text="name"
          item-value="id"
          v-model="app.editor.sectionId"
          :edit.sync="sectionId.name"
        />
        <v-btn
          icon class="mr-0"
          @click="saveSection"
        >
          <icon name="save"/>
        </v-btn>
      </template>

      <template v-if="app.mode === 'viewer'">
        <select-edit
          label="Playlist"
          class="playlists"
          :items="playlists"
          v-model="app.viewer.playlist"
          item-text="name"
          :return-object="true"
          :edit.sync="app.viewer.playlist.name"
        />
        <v-btn
          icon
          class="mr-0"
          :class="{'primary--text': app.viewer.playlistEditor}"
          @click="app.viewer.playlistEditor = !app.viewer.playlistEditor"
        >
          <icon name="playlist-edit"/>
        </v-btn>
      </template>
    </template>

    <v-menu ref="menu" :min-width="180" left>
      <v-btn slot="activator" class="mr-0" icon>
        <icon name="menu-dots"/>
      </v-btn>
      <v-list dense>
        <fullscreen-menu-item v-if="app.env.mobile"/>
        <text-separator>Project</text-separator>
        <v-list-tile @click="$bus.$emit('newProject')">
          New
        </v-list-tile>

        <app-dialog :max-width="500" header="Open" full-width lazy>
          <v-list-tile slot="activator" @click="closeMenu">Open</v-list-tile>
          <local-projects/>
        </app-dialog>

        <text-separator>Section</text-separator>
        <v-list-tile @click="$bus.$emit('newSection')">
          New
        </v-list-tile>
        <v-list-tile>
          Save As...
        </v-list-tile>
        <v-list-tile>
          Delete
        </v-list-tile>

        <text-separator>Track</text-separator>
        <app-dialog
          :max-width="500"
          header="New Track"
          full-width lazy
        >
          <v-list-tile slot="activator" @click="closeMenu">New</v-list-tile>
          <new-track/>
        </app-dialog>
        <v-list-tile @click="deleteTrack">
          Delete
        </v-list-tile>
      </v-list>
    </v-menu>
  </v-toolbar>
</template>

<script>
import zipObject from 'lodash/zipObject'
import PlayerBg from './PlayerBg'
import AudioPreferences from './AudioPreferences'
import LocalProjects from './LocalProjects'
import NewTrack from './NewTrack'
import FullscreenMenuItem from './FullscreenMenuItem'
import SelectEdit from '@/components/SelectEdit'
import DockMenu from '@/components/DockMenu'
import ProjectStorage from '@/core/local-storage'

export default {
  components: { PlayerBg, AudioPreferences, LocalProjects, NewTrack, DockMenu, SelectEdit, FullscreenMenuItem },
  computed: {
    app () {
      return this.$store
    },
    $project () {
      return this.$service('project', ['tracks', 'index', 'audioTrack'])
    },
    $player () {
      return this.$service('player', ['playing'])
    },
    $section () {
      return this.$service('section', ['bpm'])
    },
    sectionsItems () {
      return this.$project.index
    },
    sectionId () {
      return this.sectionsItems.find(s => s.id === this.app.editor.sectionId)
    },
    playlists () {
      return this.$project.playlists
    },
    tracksIcons () {
      const icons = this.$project.tracks.map(track => {
        if (track.type === 'drums') {
          return track.kit === 'Percussions' ? 'percussions' : 'drums'
        }
        return track.type
      })
      return zipObject(this.$project.tracks.map(track => track.id), icons)
    }
  },
  methods: {
    togglePlayback () {
      // $emit('playbackChange')
      this.$bus.$emit('playbackChange')
    },
    closeMenu () {
      this.$refs.menu.isActive = false
      // this.$refs.menu.$props.value = false
    },
    deleteTrack () {
      const trackId = this.app.track.id
      this.$project.removeTrack(trackId)
      this.$player.removeTrack(trackId)
      this.$section.removeTrack(trackId)
      this.app.track = this.$project.tracks[0]
    },
    saveSection () {
      ProjectStorage.saveProjectInfo(this.$project.id, this.$project)
      ProjectStorage.saveSection(this.$project.id, this.app.editor.sectionId, this.$section)
    }
  }
}
</script>

<style lang="scss" scoped>
/deep/ .input-group__input {
  min-height: 1.75em!important;
  height: 1.9em;
}

.main-toolbar {
  flex-shrink: 0;
  display: flex;
  justify-content: center;

  /deep/ .toolbar__content {
    width: 100%;
    height: 3.125em;
  }

  .btn {
    opacity: 0.8;
    &:hover {
      opacity: 1;
      /deep/ .btn__content:before {
        display: none;
      }
    }
    &.active {
      color: red;
    }
    .icon {
      transition: none;
      width: 1em;
      height: 1em;
    }
    &.separated {
      border-radius: 0;
      position: relative;
      margin: auto 0;
      width: 3.5em;
      &:before {
        content: "";
        position: absolute;
        left: 0;
        width: 1px;
        top: 18%;
        bottom: 18%;
        background-color: #fff;
        opacity: 0.3;
      }
    }
  }

  /deep/ .input-group {
    flex: 0 0 auto;
    width: auto;
    padding: 0.8em 0 0.25em 0;

    label {
      height: 1.25em;
      line-height: 1.25em;
    }
  }
  .input-group--select {
    min-width: 180px;
  }

  .tracks {
    .icon {
      width: 1em;
      height: 1em;
      margin-right: 0.25em;
    }
  }

  .player {
    position: relative;
    height: 3em;
    padding-left: 1em;
    padding-right: 0.7em;
    display: flex;

    .bpm-field {
      /deep/ input {
        width: 80px;
      }
      /deep/ .input-group--text-field__suffix {
        font-size: 85%;
        pointer-events: none;
        max-width: 0;
        transform: translate(-50px, 0);
      }
    }

    .btn.play {
      margin: auto 1em;
      .icon {
        width: 1.35em;
        height: 1.35em;
      }
    }
  }

  .mode-switch {
    border: 1px solid rgba(#fff, 0.2);
    border-radius: 4px;
    margin: 0 0.75em;
    position: relative;

    label {
      position: absolute;
      font-size: 67%;
      color: rgba(#fff, 0.6);
      background-color: #455A64;
      top: -0.75em;
      left: 1em;
      right: 1em;
      text-align: center;
    }
    .btn {
      margin: 0.075em 0 0.15em 0;
      padding: 1px 0;
      width: 2.5em;
      height: 2.25em;
    }
  }
}
</style>

<style lang="scss">
.menu__content.tracks {
  .list__tile--active {
    .icon {
      color: inherit;
    }
  }
  .icon {
    width: 1em;
    height: 1em;
    margin-right: 0.5em;
  }
}

.menu__content.audio-preferences {
  background-color: #fff;
  width: 250px;
}
</style>
