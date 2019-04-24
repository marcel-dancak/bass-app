<template>
  <v-list dense>
    <text-separator>Beat</text-separator>

    <v-menu offset-x open-on-hover full-width>
      <v-list-tile slot="activator" class="flex">
        <v-list-tile-title>Subdivision</v-list-tile-title>
        <v-icon small>play_arrow</v-icon>
      </v-list-tile>
      <v-list dense>
        <v-list-tile @click="setSubdivision(4)">
          <v-list-tile-title>Standard</v-list-tile-title>
          <v-icon v-if="beat.subdivision === 4">check</v-icon>
        </v-list-tile>
        <v-list-tile @click="setSubdivision(3)">
          <v-list-tile-title>Triplet</v-list-tile-title>
          <v-icon v-if="beat.subdivision === 3">check</v-icon>
        </v-list-tile>
      </v-list>
    </v-menu>

    <text-separator>Bar</text-separator>

    <v-list-tile @click="copy(beat.bar)">
      Copy
    </v-list-tile>
    <v-list-tile
      :disabled="!clipboard"
      @click="paste(beat.bar)"
    >
      Paste
    </v-list-tile>
    <v-list-tile @click="clear(beat.bar)">
      Clear
    </v-list-tile>
  </v-list>
</template>

<script>

let clipboard = null

export default {
  name: 'beat-menu',
  props: {
    beat: Object
  },
  computed: {
    track () {
      return this.$store.track
    },
    clipboard () {
      return clipboard && clipboard.instrument === this.track.type
    },
    $section () {
      return this.$service('section')
    },
    $trackSection () {
      return this.$section.tracks[this.track.id]
    }
  },
  methods: {
    close () {
      this.$emit('close')
    },
    setSubdivision (subdivision) {
      this.beat.subdivision = subdivision
      this.close()
    },
    copy (bar) {
      const data = this.$trackSection.beats.filter(b => b.bar === bar)
      clipboard = {
        instrument: this.track.type,
        data: JSON.stringify(data)
      }
      this.close()
    },
    paste (bar) {
      const data = JSON.parse(clipboard.data)
      data.forEach(beat => { beat.bar = bar })
      this.$trackSection.loadBeats(data)
      this.close()
    },
    clear (bar) {
      this.$trackSection.beats
        .filter(b => b.bar === bar)
        .forEach(b => this.$trackSection.clearBeat(b))

      this.close()
    }
  }
}
</script>

<style lang="scss" scoped>
.v-list {
  min-width: 160px;

  /deep/ .v-menu__activator {
    .v-list__tile {
      padding-right: 0.25em;
    }
  }
}
</style>
