
function analyzeSignal (buffer, offset, length) {
  let maxVal = buffer[offset]
  let minVal = buffer[offset]
  const end = offset + length
  let maxIndex = offset
  let minIndex = offset
  let value
  for (let i = offset; i < end; i += 3) {
    value = buffer[i]
    if (value > maxVal) {
      maxVal = value
      maxIndex = i
    }
    if (value < minVal) {
      minVal = value
      minIndex = i
    }
  }
  var crossIndex = maxIndex
  while (crossIndex) {
    if (buffer[crossIndex] < 0) {
      break
    }
    crossIndex--
  }
  return {
    positiveValue: maxVal,
    positiveIndex: maxIndex,
    negativeValue: minVal,
    negativeIndex: minIndex,
    absoluteValue: Math.max(maxVal, Math.abs(minVal)),
    crossIndex: crossIndex
  }
}

const StringWaveLength = {
  'B': 0.0324,
  'E': 0.024272,
  'A': 0.018182,
  'D': 0.01362,
  'G': 0.0102041
}

function fretWaveLength (string, fret) {
  const openLength = StringWaveLength[string]
  return openLength / Math.pow(Math.pow(2, 1 / 12), fret)
}

function soundWaveLength (sound) {
  return fretWaveLength(sound.string, sound.note.fret)
}

/* eslint-disable key-spacing */
const notesFrequencies = {
  'C' : 16.35,
  'C♯': 17.32,
  'D' : 18.35,
  'D♯': 19.45,
  'E' : 20.60,
  'F' : 21.83,
  'F♯': 23.12,
  'G' : 24.50,
  'G♯': 25.96,
  'A' : 27.50,
  'A♯': 29.14,
  'B' : 30.87
}
/* eslint-enable key-spacing */

function noteWaveLength (note) {
  const name = Notes.toSharp(note.name)
  return 1 / (notesFrequencies[name] * Math.pow(2, note.octave))
}


const size = 30
const fadein = [0.00001]
const fadeout = [1]
for (let i = 1; i < size; i++) {
  var x = i / size
  fadeout[i] = Math.cos(x * 0.5 * Math.PI)
  fadein[i] = Math.cos((1.0 - x) * 0.5 * Math.PI)
}
fadein.push(1)
fadeout.push(0.00001)

const fadeInArray = new Float32Array(fadein)
const fadeOutArray = new Float32Array(fadeout)

function fadeIn (volume) {
  for (var i = 1; i < fadeInArray.length; i++) {
    fadeInArray[i] = fadein[i] * volume
  }
  return fadeInArray
}
function fadeOut (volume) {
  for (var i = 0; i < fadeOutArray.length - 1; i++) {
    fadeOutArray[i] = fadeout[i] * volume
  }
  return fadeOutArray
}

const stepRate = {}
const averageStepRate = {}

for (let i = -12; i < 13; i++) {
  stepRate[i] = Math.pow(Math.pow(2, 1 / 12), i)
  averageStepRate[i] = (1 + stepRate[i]) / 2
}

function AudioComposer () {}

AudioComposer.prototype.bend = function (audio, sound, duration, startTime, beatTime) {
  let durationOffset = 0
  function bendSound (sRate, sTime, eRate, eTime) {
    audio.source.playbackRate.setValueAtTime(sRate, startTime + sTime * duration)
    audio.source.playbackRate.linearRampToValueAtTime(eRate, startTime + eTime * duration)
    const avgRate = (sRate + eRate) / 2
    const bendDuration = (eTime - sTime) * duration
    const offset = (avgRate - 1) * bendDuration
    // console.log('{0} -> {1} ({2} to {3}) : {4}'.format(sRate, eRate, sTime, eTime, offset));
    // console.log('avg rage: {0} duration: {1}'.format(avgRate, bendDuration));
    durationOffset += offset
  }

  // console.log(sound.note.bend)
  // var config = sound.note.bend || ''
  // var parts = config.split(',').map(v => parseFloat(v))
  var parts = sound.note.bend // .map(v => v * 2)
  for (let i = 1; i < parts.length; i++) {
    const prevBend = parts[i - 1]
    const bend = parts[i]
    if (bend !== prevBend) {
      bendSound(
        Math.pow(Math.pow(2, 1 / 12), prevBend),
        (i - 1) / (parts.length - 1),
        Math.pow(Math.pow(2, 1 / 12), bend),
        i / (parts.length - 1)
      )
    } else {
      var offset = (Math.pow(Math.pow(2, 1 / 12), bend) - 1) * (1 / (parts.length - 1)) * duration
      // console.log('no bending:', offset)
      durationOffset += offset
    }
  }
  // console.log('durationOffset:', durationOffset)
  audio.duration += durationOffset
}

function findWavePattern (note, ab, channel) {
  const buffer = ab.getChannelData(channel)
  const sampleRate = ab.sampleRate

  const maxWaveSize = parseInt(sampleRate * noteWaveLength(note))

  // var sIndex = ab.length - 5*maxWaveSize;
  var sIndex = 2 * sampleRate
  var start = analyzeSignal(buffer, sIndex, parseInt(1.5 * maxWaveSize))
  var end = analyzeSignal(buffer, start.crossIndex + parseInt(maxWaveSize * 2.85), parseInt(1.3 * maxWaveSize))
  var sampleSize = end.crossIndex - start.crossIndex
  console.log('sample:', sampleSize)
  if (sampleSize < 100) {
    end = analyzeSignal(buffer, start.crossIndex + parseInt(maxWaveSize * 1.85), parseInt(1.5 * maxWaveSize))
    sampleSize = end.crossIndex - start.crossIndex
    console.log('Retry, sample:', sampleSize)
  }
  let diff = buffer[end.crossIndex] - buffer[start.crossIndex]
  const diff2 = buffer[end.crossIndex - 1] - buffer[start.crossIndex]
  const diff3 = buffer[end.crossIndex + 1] - buffer[start.crossIndex]

  if (Math.abs(diff) > Math.abs(diff2)) {
    diff = diff2
    end.crossIndex--
  }
  if (Math.abs(diff) > Math.abs(diff3)) {
    diff = diff3
    end.crossIndex++
  }
  const pattern = buffer.slice(start.crossIndex, end.crossIndex)

  // smooth transitions between waves
  pattern[0] += diff
  for (let i = 1; i < 20; i++) {
    pattern[i] += diff * (1 - i / 20)
  }

  // console.log(pattern.slice(0, 5)+'  ...  '+pattern.slice(-5));
  // console.log([pattern[pattern.length-2], pattern[pattern.length-1], pattern[0], pattern[1]]);
  // console.log([
  //   Math.abs(pattern[pattern.length-3] - pattern[pattern.length-2]),
  //   Math.abs(pattern[pattern.length-2] - pattern[pattern.length-1]),
  //   Math.abs(pattern[pattern.length-1] - pattern[0]),
  //   Math.abs(pattern[0] - pattern[1]),
  //   Math.abs(pattern[1] - pattern[2])
  // ]);
  return {
    data: pattern,
    startIndex: start.crossIndex,
    endIndex: end.crossIndex
  }
}


/* function waveDiff (buff1, buff2) {
  let diff = 0
  for (var i = 0; i < buff1.length; i++) {
    diff += buff2[i] - buff1[i]
  }
  return diff
} */

function findWavePattern3 (note, ab, channel) {
  const buffer = ab.getChannelData(channel)
  const sampleRate = ab.sampleRate
  const waveSize = parseInt(sampleRate * noteWaveLength(note))
  // var start = parseInt(2.3 * sampleRate)
  const start = parseInt(ab.length - 5 * waveSize)

  // console.log('START: '+(start/sampleRate)+' of '+ab.duration)

  const info = analyzeSignal(buffer, start, parseInt(1.1 * waveSize))
  const endStart = info.positiveIndex + 1 * waveSize - parseInt(0.04 * waveSize)
  const end = analyzeSignal(buffer, endStart, parseInt(0.08 * waveSize))


  end.positiveIndex = info.positiveIndex + waveSize

  // var pattern = buffer.slice(start, start+waveSize);
  const pattern = buffer.slice(info.positiveIndex, end.positiveIndex)


  const len = parseInt(pattern.length * 0.05)
  // console.log('Smooth '+len)
  const diff = pattern[0] - pattern[pattern.length - 1]
  // console.log('DIFF: '+diff)
  // create smooth transition with beginning
  for (var i = 0; i < len; i++) {
    pattern[pattern.length - i - 1] += diff * (1 - i / len)
  }

  // for (var i = 1; i < waveSize-1; i++) {
  //   pattern[i] = (pattern[i-1]+pattern[i+1])/2
  // }

  // console.log('Wave Diff: ', waveDiff(pattern, buffer.subarray(end.positiveIndex, end.positiveIndex+pattern.length)));
  // console.log('Alg3: ', info.positiveIndex/sampleRate, ' - ', end.positiveIndex/sampleRate)
  return {
    data: pattern,
    startIndex: info.positiveIndex,
    endIndex: end.positiveIndex
  }
}


AudioComposer.prototype.enlarge = function (note, ab, duration) {
  const sampleRate = ab.sampleRate
  const pattern = []
  for (let ch = 0; ch < ab.numberOfChannels; ch++) {
    pattern.push(findWavePattern3(note, ab, ch))
  }
  const repeats = Math.ceil((duration * sampleRate - pattern[0].startIndex) / pattern[0].data.length)
  const maxLength = Math.max.apply(null, pattern.map(p => p.startIndex + (repeats * p.data.length)))

  const output = this.context.createBuffer(ab.numberOfChannels, maxLength, sampleRate)

  for (let ch = 0; ch < ab.numberOfChannels; ch++) {
    output.getChannelData(ch).set(ab.getChannelData(ch), 0)
    for (var i = 0, offset = pattern[ch].startIndex; i < repeats; i++) {
      // output.copyToChannel(pattern[ch].data, ch, offset)
      output.getChannelData(ch).set(pattern[ch].data, offset)
      offset += pattern[ch].data.length
    }
    const dest = output.getChannelData(ch).subarray(pattern[ch].endIndex)
    for (let i = 0; i < dest.length; i++) {
      dest[i] *= 1 - 0.4 * (i / dest.length)
    }
  }
  return output
}

AudioComposer.prototype.letRingSound = function (note, ab, duration) {
  const pattern = findWavePattern(note, ab)
  const repeats = Math.ceil(duration * ab.sampleRate / pattern.data.length)
  const output = this.context.createBuffer(
    ab.numberOfChannels,
    repeats * pattern.data.length,
    ab.sampleRate
  )
  for (let i = 0, offset = 1; i < repeats; i++) {
    // output.copyToChannel(pattern.data, 0, offset-1)
    output.getChannelData(0).set(pattern.data, offset - 1)
    offset += pattern.data.length
  }
  return output
}

/*
function AudioArray() {
  var segments = []
  return {
    segments,
    add (audio) {
      segments.push(audio)
    },
    last () {
      return segments[segments.length - 1]
    },
    play (startTime) {
      segments.forEach(audio => {
        audio.play(audio.startTime, audio.offset)
      })
    }
  }
}
*/

function join (audio1, audio2) {
  var sampleRate = audio1.source.buffer.sampleRate
  var buffer1 = audio1.source.buffer.getChannelData(0)
  var buffer2 = audio2.source.buffer.getChannelData(0)

  var waveLength = soundWaveLength(audio1.sound)
  var searchMaxSize = parseInt(1.5 * waveLength * sampleRate)

  var endIndex = parseInt(audio1.duration * sampleRate)
  var cross1 = analyzeSignal(buffer1, endIndex - parseInt(waveLength * sampleRate), searchMaxSize).crossIndex
  var endOffset = (cross1 - endIndex) / sampleRate
  // console.log('Audio1 end offset: '+endOffset);
  var fadeStartTime = audio1.endTime + endOffset
  audio1.gain.setValueCurveAtTime(fadeOut(audio1.sound.volume), fadeStartTime, waveLength - 0.001)
  audio1.gain.setValueAtTime(0.00001, fadeStartTime + waveLength)
  audio1.duration += endOffset + waveLength
  audio1.endTime += endOffset + waveLength

  // second sound
  waveLength = soundWaveLength(audio2.sound)
  searchMaxSize = parseInt(1.5 * waveLength * sampleRate)
  var startIndex = parseInt(0.25 * sampleRate)
  var cross2 = analyzeSignal(buffer2, startIndex, searchMaxSize).crossIndex
  audio2.play(fadeStartTime, cross2 / sampleRate)
  audio2.gain.setValueCurveAtTime(fadeIn(audio2.sound.volume), fadeStartTime, waveLength - 0.0001)
  audio2.gain.setValueAtTime(audio2.sound.volume, fadeStartTime + waveLength)
}

function slide (prevAudio, sound, curve, startTime, beatTime, samples) {
  var steps = Math.abs(sound.note.fret - sound.endNote.fret)
  var direction = (sound.note.fret > sound.endNote.fret) ? -1 : 1

  var audio = prevAudio
  if (!audio) {
    audio = samples[0]
    audio.startTime = startTime
    audio.duration = 0
    audio.endTime = startTime
  }
  var sampleRate = audio.source.buffer.sampleRate

  var buffer = audio.source.buffer.getChannelData(0)
  var waveLength = fretWaveLength(sound.string, sound.note.fret)
  var searchMaxSize = parseInt(1.5 * waveLength * sampleRate)

  // console.log(curve[0]+' vs '+waveLength);
  var crossPointIndex = parseInt((audio.duration + curve[0]) * sampleRate)
  var info = analyzeSignal(buffer, crossPointIndex, searchMaxSize)
  var diff = info.crossIndex - crossPointIndex

  // console.log(crossPointIndex+' vs '+info.crossIndex)
  crossPointIndex = info.crossIndex
  let slide = {
    crossPointIndex: crossPointIndex,
    crossPointDuration: curve[0] + diff / sampleRate,
    nextStepDurationCorrection: -diff / sampleRate,
    crossPointTime: audio.startTime + crossPointIndex / sampleRate,
    volume: prevAudio
      ? prevAudio.volume || prevAudio.sound.volume
      : sound.volume
  }
  slide.amplitude = info.absoluteValue * slide.volume
  audio.volume = slide.volume

  // console.log('add duration: '+audio.slide.crossPointDuration)

  // console.log('first slide sound start time: '+startTime)
  // console.log('amplitude: '+info.absoluteValue)
  audio.gain.setValueAtTime(slide.volume, startTime)
  audio.duration += slide.crossPointDuration
  audio.endTime += slide.crossPointDuration

  audio.duration2 = audio.duration

  var step
  for (var i = 0; i < steps; i += step) {
    waveLength = fretWaveLength(sound.string, sound.note.fret + ((i + 1) * direction))
    var wavesCount = ((slide.nextStepDurationCorrection + curve[i + 1]) / waveLength)
    if (wavesCount < 2.5 && i + 1 < steps) {
      step = 2
    } else {
      step = 1
    }
    // console.log('Waves: {0} Step: {1}'.format(wavesCount, step));
    searchMaxSize = parseInt(1.5 * waveLength * sampleRate)

    var nextAudio = samples[i + step]
    nextAudio.duration = 0
    nextAudio.endTime = 0
    // determine next's sound offset
    buffer = nextAudio.source.buffer.getChannelData(0)
    var nextBufferOffset = parseInt(0.45 * sampleRate)
    info = analyzeSignal(buffer, nextBufferOffset, searchMaxSize)
    nextBufferOffset = info.crossIndex

    var nextStepDuration = slide.nextStepDurationCorrection + curve[i + 1]
    if (step === 2) {
      nextStepDuration += curve[i + 2]
    }
    var nextCrossPointIndex = nextBufferOffset + parseInt(nextStepDuration * averageStepRate[-step * direction] * sampleRate)
    // console.log('raw nextCrossPointIndex: '+nextCrossPointIndex)
    var nextStartRate = stepRate[-direction * step]
    // console.log((-step*direction)+' avg: '+averageStepRate[-step*direction])
    info = analyzeSignal(buffer, nextCrossPointIndex, searchMaxSize) // maybe add small step back to search region
    diff = info.crossIndex - nextCrossPointIndex
    nextCrossPointIndex = info.crossIndex
    // console.log('nextStepDuration: {0} nextCrossPointIndex: {1} nextStartRate: {2}'.format(nextStepDuration, nextCrossPointIndex, nextStartRate));

    var volumeCorrection = slide.amplitude / info.absoluteValue
    const nextSlide = {
      crossPointIndex: nextCrossPointIndex,
      crossPointDuration: nextStepDuration + diff / sampleRate,
      nextStepDurationCorrection: -diff / sampleRate,
      crossPointTime: slide.crossPointTime + nextStepDuration + diff / sampleRate, // relative to the begining of the whole slide
      amplitude: info.absoluteValue * volumeCorrection,
      volume: volumeCorrection,
      startRate: nextStartRate
    }

    // setup playback
    audio.duration += nextSlide.crossPointDuration
    audio.endTime += nextSlide.crossPointDuration
    slide.endRate = stepRate[step * direction]

    audio.source.playbackRate.setValueAtTime(1, slide.crossPointTime)
    audio.source.playbackRate.linearRampToValueAtTime(slide.endRate, nextSlide.crossPointTime)
    audio.gain.setValueAtTime(slide.volume, slide.crossPointTime)
    audio.gain.linearRampToValueAtTime(0.00001, nextSlide.crossPointTime)
    // audio.gain.setValueCurveAtTime(fadeOut(slide.volume), slide.crossPointTime+0.0001, nextSlide.crossPointDuration-0.0002)
    // audio.gain.setValueAtTime(0.00001, nextSlide.crossPointTime)

    audio.play(audio.startTime, audio.offset)

    nextAudio.startTime = slide.crossPointTime
    nextAudio.source.playbackRate.setValueAtTime(nextSlide.startRate, nextAudio.startTime)
    nextAudio.source.playbackRate.linearRampToValueAtTime(1, nextSlide.crossPointTime)

    nextAudio.gain.setValueAtTime(0.00001, nextAudio.startTime)
    nextAudio.gain.linearRampToValueAtTime(nextSlide.volume, nextSlide.crossPointTime - 0.0001)
    // nextAudio.gain.setValueCurveAtTime(fadeIn(nextSlide.volume), nextAudio.startTime+0.0001, nextSlide.crossPointDuration-0.0002);
    // nextAudio.gain.setValueAtTime(nextSlide.volume, nextAudio.startTime+nextSlide.crossPointDuration);
    // console.log('{0} fade in: at {1} duration {2}'.format(i, nextAudio.startTime, nextSlide.crossPointDuration));
    nextAudio.offset = nextBufferOffset / sampleRate
    nextAudio.duration = nextSlide.crossPointDuration
    nextAudio.endTime = nextSlide.crossPointTime
    nextAudio.volume = nextSlide.volume
    audio = nextAudio
    slide = nextSlide
  }

  audio.duration += curve[curve.length - 1] // +0.1
  audio.endTime += curve[curve.length - 1]
  // audio.gain.setValueAtTime(slide.volume, slide.crossPointTime + 0.0001)
  audio.play(audio.startTime, audio.offset)
  return audio
}

export default {
  join,
  slide
}
