import Vue from 'vue'

const drag = {
  dragging: false,
  sound: null,
  emitEvent (type, evt) {
    const dataTransfer = {
      sound: drag.sound
    }
    const event = new MouseEvent(type, evt)
    Object.defineProperty(event, 'dataTransfer', {value: dataTransfer})
    evt.target.dispatchEvent(event)
  },
  init (el, opts) {
    el.addEventListener('mousedown', e => {
      drag.opts = opts
      document.addEventListener('mousemove', drag.dragOver)
      document.addEventListener('mouseup', (evt) => {
        document.removeEventListener('mousemove', drag.dragOver)
        if (drag.dragging) {
          drag.emitEvent('drop', evt)
          drag.dragging = false
          drag.vm.$destroy()
          drag.el.remove()
          drag.el = null
        }
      }, {once: true})
    })
  },
  dragOver (evt) {
    if (!drag.dragging) {
      const info = drag.opts.dragInfo()
      drag.sound = info.data
      // drag.el = info.el

      const container = document.createElement('div')
      document.querySelector('[data-app="true"]').appendChild(container)
      drag.vm = new Vue({
        el: container,
        data: () => ({
          effect: 'move'
        }),
        render (h) {
          return (
            <div class="drag-container">
              {info.render(h)}
              {this.effect === 'copy' ? <icon name="plus" /> : null}
            </div>
          )
        },
        mounted () {
          drag.el = this.$el
          // this.$destroy()
        }
      })
      drag.dragging = true
    }
    drag.vm.effect = evt.ctrlKey ? 'copy' : 'move'
    if (drag.el) {
      drag.el.style.left = (evt.clientX - 8) + 'px'
      drag.el.style.top = (evt.clientY - 16) + 'px'
    }

    if (drag.lastTarget !== evt.target) {
      console.log('DragEnter/Leave')
      if (drag.lastTarget) {
        const event = new MouseEvent('dragleave', evt)
        drag.lastTarget.dispatchEvent(event)
      }
    }
    drag.emitEvent('dragover', evt)
    drag.lastTarget = evt.target
  }
}

Vue.directive('drag-sound', {
  bind (el, binding) {
    drag.init(el, {
      dragInfo () {
        return binding.value()
      }
    })
  }
})
