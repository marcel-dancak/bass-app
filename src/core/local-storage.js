import LZString from 'lz-string'
import omit from 'lodash/omit'

function readData (key) {
  let data = localStorage.getItem(key)
  if (data) {
    if (!data.startsWith('{')) {
      data = LZString.decompressFromUTF16(data)
    }
    return JSON.parse(data)
  }
}

export default {
  projectsList () {
    return readData('bd.projects') || []
  },

  saveProjectList (items) {
    localStorage.setItem('bd.projects', LZString.compressToUTF16(JSON.stringify(items)))
  },

  projectInfo (id) {
    const projectInfo = readData(`bd.project.${id}`)
    const playlists = readData(`bd.playlists.${id}`) || []
    projectInfo.playlists = playlists
    return projectInfo
  },

  saveProjectInfo (projectId, project) {
    const data = {
      ...omit(project, 'playlists', 'index'),
      sections: project.index
    }
    const key = `bd.project.${projectId}`
    localStorage.setItem(key, LZString.compressToUTF16(JSON.stringify(data)))
  },

  sectionData (projectId, sectionId) {
    return readData(`bd.section.${projectId}.${sectionId}`)
  },

  saveSection (projectId, sectionId, section) {
    const key = `bd.section.${projectId}.${sectionId}`
    localStorage.setItem(key, LZString.compressToUTF16(JSON.stringify(section)))
  },

  savePlaylists (projectId, data) {
    const key = `bd.playlists.${projectId}`
    localStorage.setItem(key, LZString.compressToUTF16(data))
  }
}
