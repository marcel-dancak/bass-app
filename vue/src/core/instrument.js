export const Audio = {
  play (start, offset = 0) {
    this.startTime = start
    this.endTime = start + this.duration
    this.offset = offset
    this.source.start(start, offset)

    if (this.onplay) {
      this.onplay()
    }
  },
  fadeOut (duration) {
    this._fadeOut = {
      time: this.endTime - duration,
      gain: this.volume || this.gain.value
    }
    this.gain.setValueAtTime(this._fadeOut.gain, this._fadeOut.time)
    this.gain.linearRampToValueAtTime(0.000001, this.endTime)
  },
  cancelFadeOut () {
    if (this._fadeOut) {
      this.gain.cancelScheduledValues(this._fadeOut.time - 0.01)
      this._fadeOut = null
    }
  },
  stop (time) {
    this.gain.setValueAtTime(0.000001, time)
  },
  addDuration (duration) {
    this.cancelFadeOut()
    this.endTime += duration
    this.duration += duration
  }
}

