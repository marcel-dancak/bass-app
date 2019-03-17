<template>
  <div class="layout column pb-2">
    <v-layout
      style="user-select: none"
      class="header align-center pl-3 pr-1"
      @mousedown="$dockMenu.startDragging"
    >
      <small><b>Audio Preferences</b></small>

<!--       <app-dialog ref="audioTrackDialog" :max-width="500" header="Stream" full-width lazy>
        <v-btn icon small slot="activator">
          <icon name="youtube"/>
        </v-btn>
        <v-card>
          <v-card-text>
            <v-text-field
              label="URL"
              :value="$project.audioTrack ? $project.audioTrack.source.resource : 'ee'"
              @input="$project.audioTrack"
              hide-details
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer/>
            <v-btn @click="$refs.audioTrackDialog.close()">Close</v-btn>
            <v-btn class="primary">Ok</v-btn>
          </v-card-actions>
        </v-card>
      </app-dialog> -->
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
      :track="$project.audioTrack"
      :audio-track="$player.audioTrack"
    />
  </div>
</template>

<script>
import TrackVolumeField from './TrackVolumeField'

export default {
  name: 'autio-preferences',
  components: { TrackVolumeField },
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
