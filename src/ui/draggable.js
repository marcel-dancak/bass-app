function restrict (value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function Draggable (elem) {
  let transform = null

  return {
    onDragStart (evt) {
      const bounds = elem.getBoundingClientRect()

      const offset = transform || { x: 0, y: 0 }
      const minX = -bounds.x + offset.x
      const minY = -bounds.y + offset.y
      const maxX = window.innerWidth - (bounds.x - offset.x) - bounds.width
      const maxY = window.innerHeight - (bounds.y - offset.y) - bounds.height
      const startX = evt.clientX
      const startY = evt.clientY
      const origTransition = elem.style.transition

      const onDrag = (evt) => {
        const x = restrict(offset.x + evt.clientX - startX, minX, maxX)
        const y = restrict(offset.y + evt.clientY - startY, minY, maxY)
        requestAnimationFrame(() => {
          elem.style.transform = `translate3d(${x}px, ${y}px, 0)`
        })
        transform = { x, y }
      }

      const onDragEnd = (evt) => {
        document.removeEventListener('mousemove', onDrag)
        elem.style.transition = origTransition
      }

      elem.style.transition = 'none'
      document.addEventListener('mousemove', onDrag)
      document.addEventListener('mouseup', onDragEnd, { once: true })
    },
    reset () {
      transform = null
      elem.style.transform = ''
    }
  }
}

export default Draggable
