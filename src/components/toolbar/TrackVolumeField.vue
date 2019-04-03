<template>
  <div class="layout row track-field">
    <v-slider
      :min="0"
      :max="1"
      :step="0.01"
      :value="track.volume.value"
      :disabled="track.volume.muted"
      @input="setVolume"
      hide-details
    />
    <label @click="$emit('click:label')">
      <icon v-if="icon" :name="icon" class="mr-1"/>
      <span>{{ label }}</span>
    </label>
    <slot name="actions"/>
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
    _setGain (value) {
      if (this.audioTrack) {
        this.audioTrack.audio.gain.value = value
      }
    },
    setVolume (value) {
      this.track.volume.value = value
      this._setGain(value)
    },
    toggleMute () {
      const muted = !this.track.volume.muted
      this.track.volume.muted = muted
      if (muted) {
        this._setGain(0.00001)
      } else {
        this._setGain(this.track.volume.value)
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
