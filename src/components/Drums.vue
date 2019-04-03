<template>
  <div class="drums">
    <div
      v-for="drum in instrument.drums"
      :key="drum.name"
    >
      <icon
        :name="drum.name"
        @click="playSample(drum)"
      />
    </div>
  </div>
</template>

<script>
import { bufferLoader } from '@/core/buffer-loader'

export default {
  props: ['instrument'],
  computed: {
    trackId () {
      return this.$store.track.id
    }
  },
  methods: {
    async playSample (drum) {
      const { instrument, audio } = this.$player.tracks[this.trackId]
      const sound = {
        start: 0,
        volume: 0.75,
        drum: drum.name
      }
      const resources = instrument.soundResources(sound)
      await new Promise((resolve, reject) => bufferLoader.loadResources(resources, resolve, reject))
      instrument.playSound(audio, sound, this.$player.context.currentTime + 0.05, 1)
    }
  }
}
</script>

<style lang="scss">
.drums {
  .icon {
    font-size: 1em;
    width: 3em;
    height: 3em;
    cursor: pointer;
  }
}
</style>
