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
    return readData('bd.projects')
  },

  projectInfo (id) {
    const projectInfo = readData(`bd.project.${id}`)
    const playlists = readData(`bd.playlists.${id}`) || []
    projectInfo.playlists = playlists
    return projectInfo
  },

  sectionData (projectId, sectionId) {
    return readData(`bd.section.${projectId}.${sectionId}`)
  }
}
