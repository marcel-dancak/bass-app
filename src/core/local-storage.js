import LZString from 'lz-string'

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

  projectInfo (id) {
    const projectInfo = readData(`bd.project.${id}`)
    const playlists = readData(`bd.playlists.${id}`) || []
    projectInfo.playlists = playlists
    return projectInfo
  },

  saveProjectInfo (projectId, data) {
    const key = `bd.project.${projectId}`
    localStorage.setItem(key, LZString.compressToUTF16(data))
  },

  sectionData (projectId, sectionId) {
    return readData(`bd.section.${projectId}.${sectionId}`)
  },

  saveSection (projectId, sectionId, data) {
    const key = `bd.section.${projectId}.${sectionId}`
    console.log(key)
    localStorage.setItem(key, LZString.compressToUTF16(data))
  }
}
