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
          <span class={["tie", {staccato}]}>⏝</span>
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
    border-radius: 3px;
    border: 1px solid #555;
    box-shadow: 0 2px 3px 0 rgba(0, 0, 0, 0.2);
    box-sizing: border-box;
    height: 100%;
    font-size: 13px;

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
