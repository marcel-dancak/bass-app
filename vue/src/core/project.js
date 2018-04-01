
export default function Project (data) {
  console.log(data)
  return {
    name: data.name,
    sections: data.index,
    playlists: data.playlists,
    tracks: data.tracks,

    getSectionData (id) {
      const index = data.index.findIndex(s => s.id === id)
      return data.sections[index]
    }
  }
}
