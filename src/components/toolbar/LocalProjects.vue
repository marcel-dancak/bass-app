<template>
  <v-list dense>
    <v-list-tile
      v-for="project in projects"
      :key="project.id"
      @click="openProject(project)"
    >
      {{ project.name }}
    </v-list-tile>
  </v-list>
</template>

<script>
import ProjectStorage from '@/core/local-storage'
import { LocalProject } from '@/core/project'

export default {
  name: 'local-projects',
  computed: {
    projects () {
      return ProjectStorage.projectsList()
    }
  },
  methods: {
    openProject (project) {
      // this.$emit('loadProject', project)
      this.$createService(LocalProject(project.id), 'project')
    }
  }
}
</script>
