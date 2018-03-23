<script>

const Note = (h, note, display) => {
  switch (display) {
    case 'name':
      return <span>{note.name}<sub>{note.octave}</sub></span>
    case 'fret':
      return <span>{note.fret}</span>
  }
  return <div class="column">
    <span>{note.name}<sub>{note.octave}</sub></span>
    <span>{note.fret}</span>
  </div>
}

export default {
  functional: true,
  render (h, context) {
    const { sound, display } = context.props
    const { style, note } = sound

    if (style === 'ring' && note.type !== 'slide') {
      return <div class="label">‿</div>
    }

    if (note.type === 'ghost') {
      return <div class="label">x</div>
    }

    if (note.type === 'regular' || note.type === 'bend') {
      return (
        <div class="label">
          { Note(h, note, display) }
        </div>
      )
    }

    if (note.type === 'slide') {
      const cls = sound.endNote.fret > note.fret ? 'slide up' : 'slide down'
      return (
        <div class="label">
          { Note(h, note, display) }
          <span class={cls}>|</span>
          { Note(h, sound.endNote, display) }
        </div>
      )
    }
  }
}

</script>

<style lang="scss">
.sound {
  .label {
    display: flex;
    justify-content: center;

    .column {
      display: flex;
      flex-direction: column;
      line-height: 1.25em;
      font-size: 85%;
    }
    .slide {
      display: inline-block;
      width: 24px;
      &.up {
        transform: rotate(60deg);
      }
      &.down {
        transform: rotate(-60deg);
      }
    }
  }
}
</style>