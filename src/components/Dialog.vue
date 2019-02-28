<script>
export default {
  props: ['full-width', 'max-width', 'lazy', 'value', 'header'],
  data () {
    return {
      visible: false
    }
  },
  render (h) {
    const params = {
      props: {
        ...this._props,
        value: this.visible
      },
      on: {
        input: value => { this.visible = value }
      }
    }
    const activator = <template slot="activator">{this.$slots.activator[0]}</template>
    const content = (
      <v-card>
        <v-card-title
          class="px-4 py-2"
          primary-title
        >
          <span>{this.header || ''}</span>
          <v-btn icon={true} onClick={() => this.visible = false}>
            <v-icon>close</v-icon>
          </v-btn>
        </v-card-title>
        { this.$slots.default }
      </v-card>
    )
    return h('v-dialog', params, [activator, content])
  }
}
</script>

<style lang="scss" scoped>
.card__title {
  justify-content: center;
  background: #263238;
  color: #fff;
  font-size: 115%;

  .btn {
    position: absolute;
    right: 0;
    top: 0;
    color: #fff;
    margin: 0.15em;
  }
}
</style>
