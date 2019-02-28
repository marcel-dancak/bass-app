<template>
  <v-list-tile @click="toggle">
    <v-list-tile-title>
      Fullscreen
    </v-list-tile-title>
    <v-icon v-show="active">check</v-icon>
  </v-list-tile>
</template>

<script>
import FullscreenMixin from '@/mixins/fullscreen'

export default {
  mixins: [FullscreenMixin]
}
</script>
