<template>
  <div class="layout column pb-2">
    <v-layout
      style="user-select: none"
      class="header align-center pl-3 pr-1"
      @mousedown="$dockMenu.startDragging"
    >
      <small><b>Audio Preferences</b></small>

      <v-spacer/>
      <v-btn
        v-if="$dockMenu"
        icon small
        @click="$dockMenu.toggle"
      >
        <icon :name="$dockMenu.detached ? 'x' : 'detach'"/>
      </v-btn>
    </v-layout>

    <div class="pt-3"/>
    <track-volume-field
      v-for="track in $project.tracks"
      :key="track.id"
      :track="track"
      :icon="track.type"
      :label="track.name"
      :audio-track="$player.tracks[track.id]"
    />
    <track-volume-field
      v-if="$project.audioTrack"
      label="Audio Track"
      icon="audio-file"
      :track="$project.audioTrack"
      :audio-track="$player.audioTrack"
      @click:label="showAudioTrackDialog"
    >
      <app-dialog
        slot="actions"
        :max-width="320"
        header="Audio Track Timing"
        hide-overlay
        persistent
        draggable
      >
        <v-btn icon slot="activator">
          <icon name="watch"/>
        </v-btn>
        <section-time/>
      </app-dialog>
    </track-volume-field>

    <v-btn
      v-if="!$project.audioTrack"
      round small
      @click="showAudioTrackDialog"
    >
      <icon name="youtube"/>
      <span class="ml-2">Add audio</span>
    </v-btn>
    <app-dialog
      ref="audioTrackDialog"
      header="Stream"
      :max-width="500"
      :value.sync="openAudioTrackDialog"
    >
      <v-card>
        <v-card-text>
          <v-text-field
            label="URL"
            v-model="audioTrackUrl"
            hide-details
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer/>
          <v-btn @click="$refs.audioTrackDialog.close()">Cancel</v-btn>
          <v-btn
            class="primary"
            @click="confirm"
          >
            Ok
          </v-btn>
        </v-card-actions>
      </v-card>
    </app-dialog>
  </div>
</template>

<script>
import TrackVolumeField from './TrackVolumeField'
import SectionTime from './SectionTime'

export default {
  name: 'audio-preferences',
  components: { TrackVolumeField, SectionTime },
  data () {
    return {
      openAudioTrackDialog: false,
      audioTrackUrl: ''
    }
  },
  computed: {
    $project () {
      return this.$service('project', ['tracks', 'audioTrack'])
    },
    $player () {
      return this.$service('player')
    },
    $dockMenu () {
      let vnode = this.$parent
      while (vnode) {
        if (vnode.$options.name === 'dock-menu') {
          return vnode
        }
        vnode = vnode.$parent
      }
      return null
    }
  },
  methods: {
    showAudioTrackDialog () {
      this.audioTrackUrl = this.$project.audioTrack ? this.$project.audioTrack.source.resource : ''
      this.openAudioTrackDialog = true
    },
    confirm () {
      if (this.audioTrackUrl) {
        if (this.$project.audioTrack) {
          this.$project.audioTrack.source.resource = this.audioTrackUrl
        } else {
          this.$project.audioTrack = {
            source: {
              resource: this.audioTrackUrl
            },
            volume: {
              muted: false,
              value: 1
            }
          }
        }
        this.$player.addAudioTrack(this.$project.audioTrack)
      } else {
        if (this.$project.audioTrack) {
          this.$project.audioTrack = undefined
          this.$player.removeAudioTrack()
        }
      }
      this.$refs.audioTrackDialog.close()
    }
  }
}
</script>

<style lang="scss" scoped>
.track-field {
  margin-left: 0.75em;
  margin-right: 0.25em;
}
.header {
  background-color: #eee;
  border-bottom: 1px solid #ddd;
  .btn {
    margin: 0.15em;
    .icon {
      width: 0.85em;
      height: 0.85em;
    }
  }
}
</style>
