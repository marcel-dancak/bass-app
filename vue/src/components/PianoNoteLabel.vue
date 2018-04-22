<script>
import { Colors } from '../colors'

export default {
  functional: true,
  render (h, context) {
    const { sound } = context.props
    const note = sound.note
    const staccato = note.staccato

    let color = Colors[note.octave]
    if (sound.prev) {
      return (
        <div class="label" style={{background: color}}>
          <span class={['tie', {staccato}]}>⏝</span>
        </div>
      )
    }
    return (
      <div class="label" style={{background: color}}>
        <span class={{staccato}}>{note.name}<sub>{note.octave}</sub></span>
      </div>
    )
  }
}
</script>

<style scoped lang="scss">
.sound {
  .label {
    display: flex;
    justify-content: center;
    font-size: 13px;
    height: 1em;
    line-height: 0.875em;
    padding: 1px;
    border-radius: 3px;
    border: 1px solid #555;
    box-sizing: content-box;
    xbox-shadow: none;
    box-shadow: 0 2px 3px 0 rgba(0, 0, 0, 0.2);
    .tie {
      line-height: 0.35em;
    }
    .staccato:after {
      content: "•";
      position: absolute;
      padding-left: 3px;
      padding-top: 3px;
      line-height: 0.85em;
    }
  }
}
</style>
