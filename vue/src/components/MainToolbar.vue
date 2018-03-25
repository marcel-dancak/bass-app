<template>
  <v-toolbar
    dark
    color="blue-grey darken-2"
    class="main-toolbar elevation-3">
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
      class="sections"
      :items="sections"
      v-model="app.editor.sectionIndex"
      item-text="name"
      item-value="index"
      hide-details>
    </v-select>

  </v-toolbar>
</template>

<script>
export default {
  props: ['app'],
  computed: {
    sections () {
      const project = this.app.project
      console.log('project', project)
      if (!project) return []
      return project.sections.map((s, i) => ({
        index: i,
        name: s.name
      }))
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
    padding: 0 0.5em;
    .input-group__input {
    }
  }
  input-group--select {
  }
  .sections {
    min-width: 150px;
  }
}
</style>
