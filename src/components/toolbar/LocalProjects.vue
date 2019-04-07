<template>
  <div
    @dragover.prevent="dropHighlight = true"
    @dragleave.capture="dropHighlight = false"
    @drop.prevent="onDrop"
    class="file-drop-area"
    :class="{'primary--text': dropHighlight}"
  >
    <v-list dense>
      <v-list-tile
        v-for="project in projects"
        :key="project.id"
        @click="openProject(project)"
      >
        {{ project.name }}
      </v-list-tile>
    </v-list>
  </div>
</template>

<script>
import ProjectStorage from '@/core/local-storage'
import { LocalProject, JsonProject } from '@/core/project'

export default {
  name: 'local-projects',
  data () {
    return {
      dropHighlight: false
    }
  },
  computed: {
    projects () {
      return ProjectStorage.projectsList()
    }
  },
  methods: {
    openProject (project) {
      // this.$emit('loadProject', project)
      this.$createService(LocalProject(project.id), 'project')
      const updatedProjectsList = [
        { id: project.id, name: project.name },
        ...ProjectStorage.projectsList().filter(p => p.id !== project.id)
      ]
      ProjectStorage.saveProjectList(updatedProjectsList)
    },
    async onDrop (evt) {
      var file = evt.dataTransfer.files[0]
      if (file) {
        const data = await new Response(file).json()
        const project = JsonProject(data)
        const projects = ProjectStorage.projectsList()
        const projectId = Math.max(0, ...projects.map(item => item.id)) + 1
        console.log(projectId)

        ProjectStorage.saveProjectInfo(projectId, project)
        project.index.forEach(item => {
          ProjectStorage.saveSection(projectId, item.id, project.getSectionData(item.id))
        })
        ProjectStorage.savePlaylists(projectId, JSON.stringify(project.playlists))
        projects.splice(0, 0, { id: projectId, name: project.name })
        ProjectStorage.saveProjectList(projects)
      }
    }
  }
}
</script>
<style lang="scss" scoped>
.file-drop-area {
  border: 2px solid currentColor;
}
</style>
