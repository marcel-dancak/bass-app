<template>
  <v-layout column>
    <v-list dense>
      <v-list-tile
        v-for="(item, index) in items"
        :key="index"
        @click="selected = item"
        :class="{'primary--text': selected === item}"
      >
        <icon :name="item.icon" class="mr-2"/>
        <span>{{ item.label }}</span>
      </v-list-tile>
    </v-list>
    <v-flex mx-3>
      <v-text-field
        placeholder="Track Name"
        v-model="name"
      />
    </v-flex>
    <v-layout>
      <v-spacer/>
      <v-btn>Close</v-btn>
      <v-btn
        color="primary"
        :disabled="!selected || !name"
        @click="createTrack(selected)"
      >
        Ok
      </v-btn>
    </v-layout>
  </v-layout>
</template>

<script>

export default {
  name: 'local-projects',
  data () {
    return {
      name: '',
      selected: null
    }
  },
  computed: {
    items () {
      return [
        {
          icon: 'bass',
          label: 'Bass',
          params: {
            type: 'bass',
            strings: 'EADG',
            tunning: [0, 0, 0, 0]
          }
        }, {
          icon: 'drums',
          label: 'Drums'
        }, {
          type: 'drums',
          icon: 'percussions',
          label: 'Percussions'
        }, {
          icon: 'piano',
          label: 'Piano'
        }
      ]
    },
    $project () {
      return this.$service('project')
    }
  },
  methods: {
    createTrack (item) {
      const params = {
        ...item.params, // TODO: deep copy
        volume: {
          muted: false,
          value: 1
        },
        solo: false,
        name: this.name
      }
      const track = this.$project.addTrack(params)
      this.$player.addTrack(track)
    }
  }
}
</script>

<style lang="scss" scoped>
.icon {
  color: inherit!important;
  transition: none;
}
</style>
