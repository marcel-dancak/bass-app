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

    <v-spacer />

    <v-btn
      icon
      @click="togglePlayback()">
      <icon name="play" />
    </v-btn>

    <v-btn
      icon
      @click="$bus.$emit('playerBack')">
      <icon name="back" />
    </v-btn>

    <v-btn
      icon flat
      :class="{'primary--text': app.player.countdown}"
      @click="app.player.countdown = !app.player.countdown">
      <icon name="countdown" />
    </v-btn>

    <!-- <icon class="toggle" name="countdown" /> -->

    <v-btn
      icon
      :class="{'primary--text': app.player.loopMode}"
      @click="app.player.loopMode = !app.player.loopMode">
      <icon name="loop" />
    </v-btn>

    <v-btn
      icon
      :class="{'primary--text': app.player.screenLock}"
      @click="app.player.screenLock = !app.player.screenLock">
      <icon name="screen-playback" />
    </v-btn>

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
export default {
  props: ['app'],
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
  display: flex;
  justify-content: center;

  .toolbar__content {
    width: 100%;
    height: inherit!important;
  }

  .toggle {
    width: 1.25em;
    height: 1.25em;
  }
  .btn {
    transition: none;
    &.active {
      color: red;
    }
    .icon {
      width: 1.25em;
      height: 1.25em;
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
</style>
