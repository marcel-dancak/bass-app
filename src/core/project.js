import { DrumKit, PercussionKit } from './percussion'
import ProjectStorage from './local-storage'

export function Project (params) {

  // Assign track id.
  // DOTO: Store id in data
  const counter = {}
  params.tracks.forEach(track => {
    let index = counter[track.type] || 0
    track.id = `${track.type}_${index}`
    counter[track.type] = index + 1

    if (track.type === 'drums') {
      track.drums = track.kit === 'Drums' ? DrumKit : PercussionKit
    } else if (track.type === 'piano') {
      track.octaves = track.range.map(note => parseInt(note.substr(-1)))
    }
  })

  return {
    ...params,

    track (id) {
      return params.tracks.find(t => t.id === id)
    },

    newSection (name='') {
      const id = Math.max(-1, ...params.index.map(item => item.id)) + 1
      params.index.push({ id, name })
      return id
    }
  }
}


export default function JsonProject (params) {

  const { sections, ...opts } = params
  const base = Project(opts)

  return Object.assign(base, {
    getSectionData (id) {
      const index = params.index.findIndex(s => s.id === id)
      return sections[index]
    },
    addSection (data) {
      const id = base.newSection()
      sections[id] = data
    }
  })
}

export function LocalProject (projectId) {
  const params = ProjectStorage.projectInfo(projectId)
  const { sections, ...opts } = params
  opts.index = sections

  return Object.assign(Project(opts), {
    getSectionData (id) {
      return ProjectStorage.sectionData(projectId, id)
    }
  })
}
