<script>
const SoundStyleSymbols = {
  slap: 'S',
  pop: 'P',
  tap: 'T'
}

export default {
  functional: true,
  render (h, context) {
    const { sound } = context.props

    const symbol = SoundStyleSymbols[sound.style]
    const staccato = sound.note.staccato

    if (symbol || staccato) {
      const left = (100 * (sound.start + sound.end) / 2) + '%'
      // const params = {
      //   style: {left},
      //   class: [{ staccato: staccato }, 'top-label']
      // }
      // return h('div', params, symbol)
      return <div style={{left}} class={[{staccato: staccato}, 'top-label']}>{symbol}</div>
    }
    return null
  }
}
</script>

<style lang="scss">
.beat {
  .top-label {
    position: absolute;
    top: -1.75em;
    width: 1em;
    height: 1.75em;
    line-height: 1.75em;
    margin-left: -0.5em; /* or transform: translate(-50%, 0); */
    text-align: center;
    &.staccato:before {
      content: "•";
      position: absolute;
      left: 0;
      top: -0.75em;
      width: 100%;
      text-align: center;
    }
  }
}
</style>
