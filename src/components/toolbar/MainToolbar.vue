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
      :items="tracks"
      v-model="app.track"
      item-text="name"
      return-object
      content-class="tracks"
      hide-details
    >
      <template
        slot="selection"
        slot-scope="data">
        <icon :name="data.item.type" />
        <span class="input-group__selections__comma">{{ data.item.name }}</span>
      </template>
      <template
        slot="item"
        slot-scope="data">
        <icon :name="data.item.type" />
        <span class="input-group__selections__comma">{{ data.item.name }}</span>
      </template>
    </v-select>
    <v-menu
      content-class="audio-preferences"
      :close-on-content-click="false"
    >
      <v-btn icon slot="activator">
        <icon name="volume-medium"/>
      </v-btn>
      <div class="layout column">
        <track-volume-field
          v-for="track in tracks"
          :key="track.id"
          :track="track"
          :icon="track.type"
          :label="track.name"
          :audio-track="$player.tracks[track.id]"
        />
        <track-volume-field
          v-if="$project.audioTrack"
          label="Audio Track"
          :track="$project.audioTrack"
          :audio-track="$player.audioTrack"
        />
      </div>
    </v-menu>

    <v-spacer/>

    <div class="player">
      <player-bg/>
      <v-text-field
        v-if="section"
        class="bpm-field"
        v-model="section.bpm"
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
      <div class="mode-switch">
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

      <template v-if="app.mode === 'editor' && sectionIndex">
        <select-edit
          label="Section"
          :items="sectionsItems"
          item-text="name"
          item-value="id"
          v-model="app.editor.sectionIndex"
          :edit.sync="sectionIndex.name"
        />
        <v-btn icon class="mr-0">
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

<!--         <v-dialog :max-width="500" full-width>
          <v-list-tile slot="activator" @click="closeMenu">Open</v-list-tile>
          <local-projects/>
        </v-dialog> -->

<!--         <v-list-tile @click="$bus.$emit('openProject')">
          Open
        </v-list-tile> -->
        <text-separator>Section</text-separator>
        <v-list-tile>
          New
        </v-list-tile>
        <v-list-tile>
          Save As...
        </v-list-tile>
        <v-list-tile>
          Delete
        </v-list-tile>
      </v-list>
    </v-menu>
  </v-toolbar>
</template>

<script>
import PlayerBg from './PlayerBg'
import TrackVolumeField from './TrackVolumeField'
import LocalProjects from './LocalProjects'
import FullscreenMenuItem from './FullscreenMenuItem'
import SelectEdit from '@/components/SelectEdit'
import AppDialog from '@/components/Dialog'

export default {
  components: { PlayerBg, TrackVolumeField, LocalProjects, AppDialog, SelectEdit, FullscreenMenuItem },
  computed: {
    app () {
      return this.$store
    },
    $project () {
      return this.$service('project', ['tracks', 'audioTrack'])
    },
    $player () {
      return this.$service('player', ['playing'])
    },
    section () {
      return this.$service('section')
    },
    tracks () {
      return this.$project.tracks
    },
    sectionsItems () {
      return this.$project.index
    },
    sectionIndex () {
      return this.sectionsItems.find(s => s.id === this.app.editor.sectionIndex)
    },
    playlists () {
      return this.$project.playlists
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
    }
  }
}
</script>

<style lang="scss" scoped>
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
      font-size: 0.938em;
      height: 1.25em;
      line-height: 1.25em;
    }
    .input-group__input {
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
      margin: 0;
      padding: 1px 0;
      xtop: 2px;
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
  padding: 0.5em 1em;
  background-color: #fff;
  width: 250px;
}
</style>
