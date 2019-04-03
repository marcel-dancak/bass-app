<template>
  <v-layout align-center px-2 py-2>
    <template v-if="sectionStart">
      <v-text-field
        v-model.number="sectionStart[0]"
        label="Minute"
        type="number"
        min="0"
        max="1000"
        hide-details
      />
      <span class="mx-2">:</span>
      <v-text-field
        v-model.number="sectionStart[1]"
        label="Second"
        type="number"
        min="0"
        max="60"
        hide-details
      />
      <span class="mx-2">:</span>
      <v-text-field
        v-model.number="sectionStart[2]"
        label="Milisecond"
        type="number"
        min="0"
        max="1000"
        step="10"
        hide-details
      />
    </template>
  </v-layout>
</template>

<script>
export default {
  name: 'section-time',
  computed: {
    $section () {
      return this.$service('section', ['audioTrack'])
    },
    sectionStart () {
      return this.$section && this.$section.audioTrack && this.$section.audioTrack.start
    }
  },
  watch: {
    $section: {
      immediate: true,
      handler (section) {
        if (!section.audioTrack) {
          section.audioTrack = {
            start: [0, 0, 0]
          }
        }
      }
    }
  }
}
</script>
