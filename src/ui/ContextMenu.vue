<script>

export default {
  data: () => ({
    containers: [
      { isOpen: false, component: null },
      { isOpen: false, component: null }
    ]
  }),
  render (h) {
    const menuContainers = this.containers.map(menu => {
      const data = {
        props: menu.props,
        on: {
          close: () => { menu.isOpen = false }
        }
      }
      const content = menu.component ? h(menu.component, data) : null
      return (
        <v-menu
          bottom right
          transition="slide-y-transition"
          closeOnContentClick={false}
          positionX={menu.x}
          positionY={menu.y}
          value={menu.isOpen}
          onInput={value => { menu.isOpen = value }}
        >
          {content}
        </v-menu>
      )
    })
    return <div class="context-menu-container">{menuContainers}</div>
  },
  methods: {
    open (evt, component, props, opts={}) {
      const activator = evt.currentTarget
      const currentMenu = this.currentMenu
      if (currentMenu) {
        if (currentMenu.activator === activator && currentMenu.isOpen) return
        currentMenu.isOpen = false
        setTimeout(() => {
          currentMenu.component = null
          currentMenu.props = null
          currentMenu.activator = null
        }, 400)
      }
      const menu = this.containers.find(c => !c.component)
      if (menu) {
        // console.log('open', this.containers.indexOf(menu))
        Object.assign(menu, {
          x: opts.x || evt.clientX,
          y: opts.y || evt.clientY,
          isOpen: true,
          activator,
          component,
          props
        })
        this.currentMenu = menu
      }
    }
  }
}
</script>

<style lang="scss">
.context-menu-container {
  position: absolute;
}
</style>
