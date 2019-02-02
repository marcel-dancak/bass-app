<template>
  <v-list dense>
    <text-separator>Beat</text-separator>

    <v-menu offset-x open-on-hover full-width>
      <v-list-tile slot="activator">
        <v-list-tile-title>Subdivision</v-list-tile-title>
        <v-list-tile-action class="justify-end">
          <v-icon small>play_arrow</v-icon>
        </v-list-tile-action>
      </v-list-tile>
      <v-list dense>
        <v-list-tile @click="setSubdivision(4)">
          <v-list-tile-title>Standard</v-list-tile-title>
        </v-list-tile>
        <v-list-tile @click="setSubdivision(3)">
          <v-list-tile-title>Triplet</v-list-tile-title>
        </v-list-tile>
      </v-list>
    </v-menu>

<!--     <v-list-tile>
      Comment
    </v-list-tile> -->

    <text-separator>Bar</text-separator>
    <v-list-tile>
      Copy
    </v-list-tile>
    <v-list-tile>
      Paste
    </v-list-tile>
    <v-list-tile @click="clear">
      Clear
    </v-list-tile>
  </v-list>
</template>

<script>
export default {
  props: {
    beat: Object
  },
  methods: {
    setSubdivision (subdivision) {
      this.beat.subdivision = subdivision
      this.$emit('close')
    },
    clear () {
      console.log(this.beat)
      this.beat.data = []
    }
  }
}
</script>

<style lang="scss" scoped>

</style>
