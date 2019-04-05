import { DrumKit, PercussionKit } from './percussion'
import ProjectStorage from './local-storage'

export function Project (params) {
  // Assign track id.
  // DOTO: Store id in data
  const counter = {}
  const { tracks, ...rest } = params
  const project = {
    ...rest,
    tracks: [],

    track (id) {
      return this.tracks.find(t => t.id === id)
    },

    newSection (name = '') {
      const id = Math.max(-1, ...this.index.map(item => item.id)) + 1
      this.index.push({ id, name })
      return id
    },

    removeTrack (id) {
      this.tracks = this.tracks.filter(track => track.id !== id)
    },

    addTrack (track) {
      let index = counter[track.type] || 0
      track.id = `${track.type}_${index}`
      counter[track.type] = index + 1

      if (track.type === 'drums') {
        const drums = track.kit === 'Drums' ? DrumKit : PercussionKit
        Object.defineProperty(track, 'drums', { value: drums, writable: true, configurable: true, enumerable: false })
      } else if (track.type === 'piano') {
        const octaves = track.range.map(note => parseInt(note.substr(-1)))
        Object.defineProperty(track, 'octaves', { value: octaves, writable: true, configurable: true, enumerable: false })
      }
      this.tracks.push(track)
      return track
    }
  }
  tracks.forEach(track => project.addTrack(track))
  return project
}


export function JsonProject (params) {
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

  const base = Project(opts)
  const memData = {}

  return Object.assign(base, {
    id: projectId,
    getSectionData (id) {
      return ProjectStorage.sectionData(projectId, id) || memData[id]
    },
    addSection (data) {
      const id = base.newSection('New')
      memData[id] = data
      return id
    }
  })
}
