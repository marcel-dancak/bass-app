<template>
  <div class="layout row track-field">
    <label>
      <icon v-if="icon" :name="icon" class="mr-1"/>
      <span>{{ label }}</span>
    </label>
    <v-slider
      :min="0"
      :max="1"
      :step="0.01"
      :value="track.volume.value"
      :disabled="track.volume.muted"
      @input="setVolume"
      hide-details
    />
    <v-btn
      icon
      @click="toggleMute"
      :class="{'primary--text': !track.volume.muted}"
    >
      <icon :name="track.volume.muted ? 'volume-mute' : 'volume-medium'"/>
    </v-btn>
  </div>
</template>

<script>
export default {
  name: 'track-volume',
  props: {
    icon: String,
    label: String,
    track: Object,
    audioTrack: Object
  },
  methods: {
    setVolume (value) {
      this.track.volume.value = value
      this.audioTrack.audio.gain.value = value
    },
    toggleMute () {
      const muted = !this.track.volume.muted
      this.track.volume.muted = muted
      if (muted) {
        this.audioTrack.audio.gain.value = 0.00001
      } else {
        this.audioTrack.audio.gain.value = this.track.volume.value
      }
    }
  }
}
</script>

<style lang="scss">

.track-field {
  align-items: flex-end;
  position: relative;

  label {
    position: absolute;
    left: 0;
    top: 0;
    font-size: 80%;
    opacity: 0.75;

    .icon {
      width: 1.25rem;
      height: 1.25rem;
    }
  }

  .btn {
    margin: 0;
    &:not(.primary--text) .icon {
      color: #555;
    }
    .icon {
      width: 1.5rem;
      height: 1.5rem;
      transition: none;
    }
  }
}
</style>
