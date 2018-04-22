<script>
import { Colors } from '../colors'

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

    if (note.type === 'ghost') {
      return <div class="label" style={{background: Colors.ghost}}>x</div>
    }

    let color = Colors[sound.note.octave]
    if (style === 'ring' && note.type !== 'slide') {
      return <div class="label" style={{background: color}}>‿</div>
    }

    let extra = null
    if (style === 'hammer' || style === 'pull') {
      const symbol = style === 'hammer' ? 'H' : 'P'
      extra = <div class="join"><span>{symbol}</span><span>⁀</span></div>
    }
    if (note.type === 'regular' || note.type === 'bend') {
      return (
        <div class="label" style={{background: color}}>
          {extra}
          { Note(h, note, display) }
        </div>
      )
    }

    if (note.type === 'slide') {
      const cls = sound.endNote.fret > note.fret ? 'slide up' : 'slide down'
      const endColor = Colors[sound.endNote.octave]
      color = `linear-gradient(to right, ${color}, ${color}, ${endColor}, ${endColor})`
      return (
        <div class="label" style={{background: color}}>
          { style !== 'ring' && Note(h, note, display) }
          <span class={cls}>|</span>
          { Note(h, sound.endNote, display) }
        </div>
      )
    }

    if (note.type === 'grace') {
      return (
        <div class="label" style={{background: color}}>
          <small>{ Note(h, note, display) }</small>&nbsp;
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
    border-radius: 4px;
    border: 1px solid #555;
    box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.26);
    box-sizing: border-box;
    height: 100%;
    line-height: 2em;
    /*
    &.prev {
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
    }
    */

    small {
      font-size: 70%;
      line-height: 3em;
      .column {
        line-height: 1.9em;
      }
    }
    .column {
      display: flex;
      flex-direction: column;
      line-height: 1.25em;
      font-size: 85%;
    }

    .join {
      display: flex;
      flex-direction: column;
      line-height: 1.25em;
      position: absolute;
      left: -0.4em;
      top: -1.75em;
      pointer-events: none;
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
