<template>
  <v-toolbar
    dark
    color="blue-grey darken-2"
    class="main-toolbar elevation-3">
    <v-spacer />
    <v-btn icon @click="$emit('playbackChange')">
      <icon name="play" />
    </v-btn>

    <v-btn icon>
      <icon name="back" />
    </v-btn>

    <v-btn icon>
      <icon name="countdown" />
    </v-btn>

    <v-btn icon @click="player.loopMode = !player.loopMode">
      <icon name="loop" />
    </v-btn>

    <v-btn icon>
      <icon name="screen-playback" />
    </v-btn>

    <v-spacer />

    <v-select
      class="sections"
      :items="sections"
      v-model="editor.sectionIntex"
      item-text="name"
      item-value="index"
      hide-details>
    </v-select>

  </v-toolbar>
</template>

<script>
export default {
  props: ['player', 'project', 'editor'],
  computed: {
    sections () {
      console.log('sections', this.project)
      if (!this.project) return []
      return this.project.sections.map((s, i) => ({
        index: i,
        name: s.name
      }))
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

  .icon {
    width: 1.25em;
    height: 1.25em;
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
    max-width: 250px;
  }
}
</style>
