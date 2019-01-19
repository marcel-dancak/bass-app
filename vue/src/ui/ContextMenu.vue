<script>

export default {
  data: () => ({
    containers: [
      {isOpen: false, component: null},
      {isOpen: false, component: null}
    ]
  }),
  /*
  render (h) {
    const data = {
      class: 'context-menu',
      props: {
        bottom: true,
        right: true,
        closeOnContentClick: false,
        contentClass: 'sound-form bass',
        transition: 'slide-y-transition',
        positionX: this.menu.x,
        positionY: this.menu.y,
        value: this.menu.isOpen
      },
      on: {
        input: (value) => { this.menu.isOpen = value }
      }
    }
    return h('v-menu', data, [h(menu.component, {props: menu.props})])
  },
  */
  render (h) {
    const menuContainers = this.containers.map(menu => {
      const content = menu.component ? h(menu.component, {props: menu.props}) : null
      return (
        <v-menu
          bottom right
          content-class="sound-form bass"
          transition="slide-y-transition"
          closeOnContentClick={false}
          positionX={menu.x}
          positionY={menu.y}
          minWidth={280}
          value={menu.isOpen}
          onInput={value => { menu.isOpen = value }}>
          {content}
        </v-menu>
      )
    })
    return <div class="context-menu-container">{menuContainers}</div>
  },
  methods: {
    open (evt, component, props) {
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
        const bounds = activator.getBoundingClientRect()
        Object.assign(menu, {
          x: bounds.left,
          y: bounds.bottom + 2,
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
.context-menu {
  background-color: #fff;
  .layout > * {
    padding: 0.25em;
  }
  .input-group {
    label {
      font-size: 0.938em;
    }
  }
  .input-group--select .input-group__selections__comma {
    font-size: 0.938em;
  }
}
</style>
