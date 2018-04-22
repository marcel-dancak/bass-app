<template>
  <v-toolbar
    dark
    color="blue-grey darken-2"
    class="main-toolbar elevation-3">
    <v-select
      label="Track"
      class="tracks"
      :items="tracks"
      v-model="app.track"
      item-text="name"
      return-object
      content-class="tracks"
      hide-details>
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
      :close-on-content-click="false">
      <v-btn
        icon
        slot="activator">
        <icon name="volume-medium" />
      </v-btn>
      <div class="layout column">
        <track-volume-field
          v-for="track in tracks"
          :key="track.id"
          :track="track" />
      </div>
    </v-menu>

    <v-spacer />

    <div class="player">
      <player-bg />
      <v-btn
        icon
        class="play"
        @click="togglePlayback()">
        <icon :name="$player.playing ? 'pause' : 'play'" />
      </v-btn>

      <v-btn
        icon
        class="separated"
        @click="$bus.$emit('playerBack')">
        <icon name="back" />
      </v-btn>

      <v-btn
        icon
        class="separated"
        :class="{'primary--text': app.player.countdown}"
        @click="app.player.countdown = !app.player.countdown">
        <icon name="countdown" />
      </v-btn>

      <!-- <icon class="toggle" name="countdown" /> -->

      <v-btn
        icon
        class="separated"
        :class="{'primary--text': app.player.loopMode}"
        @click="app.player.loopMode = !app.player.loopMode">
        <icon name="loop" />
      </v-btn>

      <v-btn
        icon
        class="separated"
        :class="{'primary--text': app.player.screenLock}"
        @click="app.player.screenLock = !app.player.screenLock">
        <icon name="screen-playback" />
      </v-btn>
    </div>

    <v-spacer />

    <v-select
      label="Section"
      class="sections"
      :items="sections"
      v-model="app.editor.sectionIndex"
      item-text="name"
      item-value="id"
      hide-details>
    </v-select>

  </v-toolbar>
</template>

<script>
import PlayerBg from './PlayerBg'
import TrackVolumeField from './TrackVolumeField'

export default {
  components: { PlayerBg, TrackVolumeField },
  props: ['app'],
  inject: ['$player'],
  computed: {
    sections () {
      return this.app.project.sections
    },
    tracks () {
      return this.app.project.tracks
    }
  },
  methods: {
    togglePlayback () {
      // $emit('playbackChange')
      this.$bus.$emit('playbackChange')
    }
  }
}
</script>

<style lang="scss">
.main-toolbar {

  height: 3.125em;
  flex-shrink: 0;
  display: flex;
  justify-content: center;

  .toolbar__content {
    width: 100%;
    height: inherit!important;
  }

  .btn {
    opacity: 0.8;
    &:hover {
      opacity: 1;
      .btn__content:before {
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

  .input-group {
    flex: 0 0 auto;
    width: auto;
    padding: 0.8em 0 0.25em 0;
    .input-group__input {
    }
  }
  .input-group--select {
    min-width: 180px;
    label {
      font-size: 0.938em;
      height: 1.25em;
      line-height: 1.25em;
    }
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
    padding-right: 0.7em;
    display: flex;

    .btn.play {
      margin: auto 1em;
      .icon {
        width: 1.35em;
        height: 1.3p5em;
      }
    }
  }
}

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
  padding: 0.5em 1em;
}
</style>
