import Vue from 'vue'

const drag = {
  dragging: false,
  data: null,
  emitEvent (type, evt) {
    return drag.info.data.map((group, i) => {
      const x = evt.clientX + group.offset.x
      const y = evt.clientY + group.offset.y
      const target = document.elementFromPoint(x, y)
      const event = new MouseEvent(type, evt)
      Object.defineProperty(event, 'clientX', { value: x })
      Object.defineProperty(event, 'clientY', { value: y })
      const data = {
        data: drag.info.data[i].sounds,
        channel: i
      }
      Object.defineProperty(event, 'dataTransfer', { value: data })
      if (target) {
        target.dispatchEvent(event)
      }
      return event
    })
  },
  init (el, handler) {
    el.addEventListener('mousedown', e => {
      drag.startEvent = e
      drag.handler = handler
      drag.lastTargets = null
      document.addEventListener('mousemove', drag.dragOver)
      document.addEventListener('mouseup', (evt) => {
        document.removeEventListener('mousemove', drag.dragOver)
        if (drag.dragging) {
          drag.emitEvent('drop', evt)
          if (drag.handler.end) {
            drag.handler.end(evt)
          }
          drag.dragging = false
          drag.vm.$destroy()
          drag.el.remove()
          drag.el = null
        }
      }, { once: true })
    })
  },
  dragOver (evt) {
    if (!drag.dragging) {
      const diff = Math.abs(evt.clientX - drag.startEvent.clientX) + Math.abs(evt.clientY - drag.startEvent.clientY)
      if (diff < 5) {
        return
      }
      const info = drag.handler.start(drag.startEvent)
      drag.info = info

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
              {this.effect === 'copy' ? <div class="effect">+</div> : null}
            </div>
          )
        },
        mounted () {
          drag.el = this.$el
        }
      })
      drag.dragging = true
    }
    drag.vm.effect = evt.ctrlKey ? 'copy' : 'move'
    if (drag.el) {
      drag.el.style.left = evt.clientX + 'px'
      drag.el.style.top = evt.clientY + 'px'
    }

    if (drag.lastTargets) {
      const targets = drag.info.data.map(group => {
        const x = evt.clientX + group.offset.x
        const y = evt.clientY + group.offset.y
        return document.elementFromPoint(x, y)
      })
      targets.forEach((target, i) => {
        if (target !== drag.lastTargets[i] && drag.lastTargets[i]) {
          const event = new MouseEvent('dragleave')
          Object.defineProperty(event, 'channel', { value: i })
          drag.lastTargets[i].dispatchEvent(event)
        }
      })
    }
    // TODO: remove duplicit usage of document.elementFromPoint
    const evts = drag.emitEvent('dragover', evt)
    drag.lastTargets = evts.map(e => e.target)
  }
}

Vue.directive('drag-sound', {
  bind (el, binding) {
    drag.init(el, binding.value)
  }
})
