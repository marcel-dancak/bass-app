(function() {
  'use strict';

  angular
    .module('bd.app')
    .factory('AudioComposer', audioComposer);


  function audioComposer(Notes) {
  function AudioComposer(context, player) {
    this.context = context;
    this.player = player;
    this.bufferLoader = player.bufferLoader;
  }

  function analyzeSignal(buffer, offset, length) {
    var maxVal = buffer[offset];
    var minVal = buffer[offset];
    var end = offset + length;
    var maxIndex = offset;
    var minIndex = offset;
    var value;
    for (var i = offset; i < end; i += 3) {
      value = buffer[i];
      if (value > maxVal) {
        maxVal = value;
        maxIndex = i;
      }
      if (value < minVal) {
        minVal = value;
        minIndex = i;
      }
    }
    var crossIndex = maxIndex;
    while (crossIndex) {
      if (buffer[crossIndex] < 0) {
        break;
      }
      crossIndex--;
    }
    return {
      positiveValue: maxVal,
      positiveIndex: maxIndex,
      negativeValue: minVal,
      negativeIndex: minIndex,
      absoluteValue: Math.max(maxVal, Math.abs(minVal)),
      crossIndex: crossIndex
    }
  };

  function findCrossPoint(buffer, offset) {
    var i = offset;
    while (i) {
      if (buffer[i] < 0) {
        break;
      }
      i--;
    }
    return i;
  };

  var StringWaveLength = {
    'B': 0.0324,
    'E': 0.024272,
    'A': 0.018182,
    'D': 0.01362,
    'G': 0.0102041
  };

  function fretWaveLength(string, fret) {
    var openLength = StringWaveLength[string];
    return openLength/Math.pow(Math.pow(2, 1/12), fret);
  }

  function soundWaveLength(sound) {
    return fretWaveLength(sound.string, sound.note.fret);
  }

  var notesFrequencies = {
    'C':  16.35,
    'C♯': 17.32,
    'D':  18.35,
    'D♯': 19.45,
    'E':  20.60,
    'F':  21.83,
    'F♯': 23.12,
    'G':  24.50,
    'G♯': 25.96,
    'A':  27.50,
    'A♯': 29.14,
    'B':  30.87
  }

  function noteWaveLength(note) {
    var name = Notes.toSharp(note.name);
    return 1 / (notesFrequencies[name] * Math.pow(2, note.octave));
  }

  AudioComposer.prototype.join = function(audio1, audio2) {
    var buffer1 = audio1.source.buffer.getChannelData(0);
    var buffer2 = audio2.source.buffer.getChannelData(0);

    var waveLength = soundWaveLength(audio1.sound);
    var searchMaxSize = parseInt(1.5*waveLength*44100);

    var endIndex = parseInt(audio1.duration*44100);
    var cross1 = analyzeSignal(buffer1, endIndex-parseInt(waveLength*44100), searchMaxSize).crossIndex;
    var endOffset = (cross1 - endIndex)/44100;
    // console.log('Audio1 end offset: '+endOffset);
    var fadeStartTime = audio1.endTime+endOffset;
    audio1.gain.setValueCurveAtTime(fadeOut(audio1.sound.volume), fadeStartTime, waveLength-0.001);
    audio1.gain.setValueAtTime(0.00001, fadeStartTime+waveLength);
    audio1.duration += endOffset + waveLength;
    audio1.endTime += endOffset + waveLength;

    // second sound
    waveLength = soundWaveLength(audio2.sound);
    searchMaxSize = parseInt(1.5*waveLength*44100);
    var startIndex = parseInt(0.25*44100);
    var cross2 = analyzeSignal(buffer2, startIndex, searchMaxSize).crossIndex;
    audio2.offset = cross2/44100;
    audio2.startTime = fadeStartTime;
    audio2.duration = audio2.endTime - fadeStartTime;
    audio2.gain.setValueCurveAtTime(fadeIn(audio2.sound.volume), fadeStartTime, waveLength-0.0001);
    audio2.gain.setValueAtTime(audio2.sound.volume, fadeStartTime+waveLength);
  };


  var size = 30;
  var fadein = [0.00001];
  var fadeout = [1];
  for (var i = 1; i < size; i++) {
    var x = i/size;
    fadeout[i] = Math.cos(x * 0.5*Math.PI);
    fadein[i] = Math.cos((1.0 - x) * 0.5*Math.PI);
  }
  fadein.push(1);
  fadeout.push(0.00001);

  var fadeInArray = new Float32Array(fadein);
  var fadeOutArray = new Float32Array(fadeout);

  function fadeIn(volume) {
    for (var i = 1; i < fadeInArray.length; i++) {
      fadeInArray[i] = fadein[i] * volume;
    }
    return fadeInArray;
  }
  function fadeOut(volume) {
    for (var i = 0; i < fadeOutArray.length-1; i++) {
      fadeOutArray[i] = fadeout[i] * volume;
    }
    return fadeOutArray;
  }

  var stepRate = {};
  var averageStepRate = {};

  for (var i = -12; i < 13; i++) {
    stepRate[i] = Math.pow(Math.pow(2, 1/12), i);
    averageStepRate[i] = (1 + stepRate[i]) / 2;
  }

  AudioComposer.prototype.createSlide = function(track, prevAudio, sound, curve, startTime, beatTime) {
    var st = performance.now();

    var sounds = [];
    var steps = Math.abs(sound.note.fret - sound.endNote.fret);
    var direction = (sound.note.fret > sound.endNote.fret)? -1 : 1;

    var audio = prevAudio;
    if (!audio) {
      audio = this.player.createSoundAudio(track, sound, startTime, beatTime);
      audio.duration = 0;
      audio.endTime = startTime;
    }
    var buffer = audio.source.buffer.getChannelData(0);
    var waveLength = fretWaveLength(sound.string, sound.note.fret);
    var searchMaxSize = parseInt(1.5*waveLength*44100);

    // console.log(curve[0]+' vs '+waveLength);
    var crossPointIndex = parseInt((audio.duration+curve[0])*44100);
    var info = analyzeSignal(buffer, crossPointIndex, searchMaxSize);
    var diff = info.crossIndex - crossPointIndex;

    // console.log(crossPointIndex+' vs '+info.crossIndex);
    crossPointIndex = info.crossIndex;
    audio.slide = {
      crossPointIndex: crossPointIndex,
      crossPointDuration: curve[0]+diff/44100,
      nextStepDurationCorrection: -diff/44100,
      crossPointTime: audio.startTime+crossPointIndex/44100,
      // amplitude: info.absoluteValue*sound.volume,
      volume: prevAudio? prevAudio.slide? prevAudio.slide.volume : prevAudio.sound.volume : sound.volume
    };
    audio.slide.amplitude = info.absoluteValue*audio.slide.volume;

    // console.log('add duration: '+audio.slide.crossPointDuration);

    // console.log('first slide sound start time: '+startTime);
    // console.log('amplitude: '+info.absoluteValue);
    audio.gain.setValueAtTime(audio.slide.volume, startTime);
    audio.duration += audio.slide.crossPointDuration;
    audio.endTime += audio.slide.crossPointDuration;

    audio.duration2 = audio.duration;

    /*
    // Version with new start sound
    var audio = this.player.createSoundAudio(sound, startTime, 0);
    var buffer = audio.source.buffer.getChannelData(0);
    var waveLength = fretWaveLength(sound.string, sound.note.fret);
    var searchMaxSize = parseInt(1.5*waveLength*44100);

    var bufferOffset = parseInt(0.45*44100);
    info = analyzeSignal(buffer, bufferOffset, searchMaxSize);
    bufferOffset = info.crossIndex;
    audio.offset = bufferOffset/44100;

    var crossPointIndex = bufferOffset+parseInt((curve[0])*44100);
    var info = analyzeSignal(buffer, crossPointIndex, searchMaxSize);
    var diff = info.crossIndex - crossPointIndex;
    //console.log(crossPointIndex+' vs '+info.crossIndex);
    crossPointIndex = info.crossIndex;

    audio.slide = {
      crossPointIndex: crossPointIndex,
      crossPointDuration: curve[0]+diff/44100,
      nextStepDurationCorrection: -diff/44100,
      crossPointTime: audio.startTime+crossPointIndex/44100,
      amplitude: info.absoluteValue*sound.volume,
      volume: sound.volume
    };
    audio.gain.setValueAtTime(audio.slide.volume, startTime);
    audio.startTime = startTime;
    audio.duration = audio.slide.crossPointDuration;
    audio.endTime = startTime + audio.duration;
    */

    var step;
    for (var i = 0; i < steps; i += step) {
      waveLength = fretWaveLength(sound.string, sound.note.fret+((i+1)*direction));
      var wavesCount = ((audio.slide.nextStepDurationCorrection + curve[i+1]) / waveLength);
      if (wavesCount < 2.5 && i+1 < steps) {
        step = 2;
      } else {
        step = 1;
      }
      // console.log('Waves: {0} Step: {1}'.format(wavesCount, step));
      searchMaxSize = parseInt(1.5*waveLength*44100);

      var nextAudio = this.player.createSoundAudio(track, sound, 0, beatTime, i+step);
      nextAudio.duration = 0;
      nextAudio.endTime = 0;
      // determine next's sound offset
      buffer = nextAudio.source.buffer.getChannelData(0);
      var nextBufferOffset = parseInt(0.45*44100);
      info = analyzeSignal(buffer, nextBufferOffset, searchMaxSize);
      nextBufferOffset = info.crossIndex;

      var nextStepDuration = audio.slide.nextStepDurationCorrection+curve[i+1];
      if (step === 2) {
        nextStepDuration += curve[i+2];
      }
      var nextCrossPointIndex = nextBufferOffset + parseInt(nextStepDuration*averageStepRate[-step*direction]*44100);
      // console.log('raw nextCrossPointIndex: '+nextCrossPointIndex);
      var nextStartRate = stepRate[-direction*step];
      // console.log((-step*direction)+' avg: '+averageStepRate[-step*direction]);
      info = analyzeSignal(buffer, nextCrossPointIndex, searchMaxSize); // maybe add small step back to search region
      diff = info.crossIndex - nextCrossPointIndex;
      nextCrossPointIndex = info.crossIndex;
      // console.log('nextStepDuration: {0} nextCrossPointIndex: {1} nextStartRate: {2}'.format(nextStepDuration, nextCrossPointIndex, nextStartRate));

      var volumeCorrection = audio.slide.amplitude/info.absoluteValue;
      nextAudio.slide = {
        crossPointIndex: nextCrossPointIndex,
        crossPointDuration: nextStepDuration + diff/44100,
        nextStepDurationCorrection: -diff/44100,
        crossPointTime: audio.slide.crossPointTime+nextStepDuration + diff/44100,// relative to the begining of the whole slide
        amplitude: info.absoluteValue*volumeCorrection,
        volume: volumeCorrection,
        startRate: nextStartRate
      };

      // setup playback
      audio.duration += nextAudio.slide.crossPointDuration;
      audio.endTime += nextAudio.slide.crossPointDuration;
      audio.slide.endRate = stepRate[step*direction];
      audio.source.playbackRate.setValueAtTime(1, audio.slide.crossPointTime);
      audio.source.playbackRate.linearRampToValueAtTime(audio.slide.endRate, nextAudio.slide.crossPointTime);
      audio.gain.setValueAtTime(audio.slide.volume, audio.slide.crossPointTime);
      audio.gain.linearRampToValueAtTime(0.00001, nextAudio.slide.crossPointTime);
      // audio.gain.setValueCurveAtTime(fadeOut(audio.slide.volume), audio.slide.crossPointTime+0.0001, nextAudio.slide.crossPointDuration-0.0002);
      // audio.gain.setValueAtTime(0.00001, nextAudio.slide.crossPointTime);

      sounds.push(audio);

      nextAudio.startTime = audio.slide.crossPointTime;
      nextAudio.source.playbackRate.setValueAtTime(nextAudio.slide.startRate, nextAudio.startTime);
      nextAudio.source.playbackRate.linearRampToValueAtTime(1, nextAudio.slide.crossPointTime);

      nextAudio.gain.setValueAtTime(0.00001, nextAudio.startTime);
      nextAudio.gain.linearRampToValueAtTime(nextAudio.slide.volume, nextAudio.slide.crossPointTime-0.0001);
      // nextAudio.gain.setValueCurveAtTime(fadeIn(nextAudio.slide.volume), nextAudio.startTime+0.0001, nextAudio.slide.crossPointDuration-0.0002);
      // nextAudio.gain.setValueAtTime(nextAudio.slide.volume, nextAudio.startTime+nextAudio.slide.crossPointDuration);
      // console.log('{0} fade in: at {1} duration {2}'.format(i, nextAudio.startTime, nextAudio.slide.crossPointDuration));
      nextAudio.offset = nextBufferOffset/44100;
      nextAudio.duration = nextAudio.slide.crossPointDuration;
      nextAudio.endTime = nextAudio.slide.crossPointTime;
      audio = nextAudio;
    }

    var sum = 0;
    for (var i = 0; i < curve.length; i++) {
      sum += curve[i];
    }
    audio.duration += curve[curve.length-1];//+0.1;
    audio.endTime += curve[curve.length-1];
    // audio.gain.setValueAtTime(audio.slide.volume, audio.slide.crossPointTime+0.0001);
    sounds.push(audio);
    return sounds;
  };


  AudioComposer.prototype.bend = function(audio, sound, duration, startTime, beatTime) {
    var durationOffset = 0;
    function bendSound(sRate, sTime, eRate, eTime) {
      audio.source.playbackRate.setValueAtTime(sRate, startTime+sTime*duration);
      audio.source.playbackRate.linearRampToValueAtTime(eRate, startTime+eTime*duration);
      var avgRate = (sRate + eRate) / 2;
      var bendDuration = (eTime - sTime) * duration;
      var offset = (avgRate - 1) * bendDuration;
      // console.log('{0} -> {1} ({2} to {3}) : {4}'.format(sRate, eRate, sTime, eTime, offset));
      // console.log('avg rage: {0} duration: {1}'.format(avgRate, bendDuration));
      durationOffset += offset;
    }

    // console.log(sound.note.bend)
    // var config = sound.note.bend || '';
    // var parts = config.split(',').map(function(v) {return parseFloat(v)});
    var parts = sound.note.bend//.map(function(v) {return v*2});
    for (var i = 1; i < parts.length; i++) {
      var prevBend = parts[i-1];
      var bend = parts[i];
      if (bend !== prevBend) {
        bendSound(
          Math.pow(Math.pow(2, 1/12), prevBend),
          (i - 1) / (parts.length - 1),
          Math.pow(Math.pow(2, 1/12), bend),
          i / (parts.length - 1)
        );
      } else {
        var offset = (Math.pow(Math.pow(2, 1/12), bend) - 1) * (1/(parts.length-1)) * duration;
        // console.log('no bending: '+offset);
        durationOffset += offset;
      }
    }
    // console.log('durationOffset: '+durationOffset);
    audio.duration += durationOffset;
  };

  AudioComposer.prototype.findWavePattern = function(note, ab, channel) {
    var buffer = ab.getChannelData(channel);
    var sampleRate = ab.sampleRate;

    var maxWaveSize = parseInt(sampleRate * noteWaveLength(note));

    // var sIndex = ab.length - 5*maxWaveSize;
    var sIndex = 2 * sampleRate;
    var start = analyzeSignal(buffer, sIndex, parseInt(1.5*maxWaveSize));
    var end = analyzeSignal(buffer, start.crossIndex + parseInt(maxWaveSize*2.85), parseInt(1.3*maxWaveSize));
    var sampleSize = end.crossIndex - start.crossIndex;
    console.log('sample: '+sampleSize);
    if (sampleSize < 100) {
      end = analyzeSignal(buffer, start.crossIndex + parseInt(maxWaveSize*1.85), parseInt(1.5*maxWaveSize));
      sampleSize = end.crossIndex - start.crossIndex;
      console.log('Retry, sample: '+sampleSize);
    }
    var diff = buffer[end.crossIndex] - buffer[start.crossIndex];
    var diff2 = buffer[end.crossIndex-1] - buffer[start.crossIndex];
    var diff3 = buffer[end.crossIndex+1] - buffer[start.crossIndex];
    console.log('{0} to {1} (diff: {2}, (-1): {3} (+1): {4})'.format(
      buffer[end.crossIndex],
      buffer[start.crossIndex],
      diff,
      diff2,
      diff3
    ));
    if (Math.abs(diff) > Math.abs(diff2)) {
      diff = diff2;
      end.crossIndex--;
    }
    if (Math.abs(diff) > Math.abs(diff3)) {
      diff = diff3;
      end.crossIndex++;
    }

    var pattern = buffer.slice(start.crossIndex, end.crossIndex);

    // smooth transitions between waves
    pattern[0] += diff;
    for (var i = 1; i < 20; i++) {
      pattern[i] += diff*(1-i/20);
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
/*
  AudioComposer.prototype.findWavePattern2 = function(note, ab, channel) {
    var buffer = ab.getChannelData(channel);
    var sampleRate = ab.sampleRate;
    var maxWaveSize = parseInt(sampleRate * noteWaveLength(note));
    var start = parseInt(2 * sampleRate);
    
    // var max = Math.max.apply(null, buffer.subarray(start, end));
    // var min = Math.min.apply(null, buffer.subarray(start, end));
    // console.log('Max: '+max);
    // console.log('Min: '+min);

    console.log('START: '+start);
    if (buffer[start] > 0) {
      while (buffer[--start] > 0) {};
    } else {
      while (buffer[--start] < 0) {};
    }
    start++;
    console.log('ALIGNED START: '+start+' /'+(start/sampleRate));
    console.log(buffer[start-1], buffer[start], buffer[start+1])
    var end = start + maxWaveSize*1;

    var len = parseInt(maxWaveSize * 0.05);
    var bestMatch = 1;
    var bestMatchIndex = end;
    var diff;
    console.log('Expected End: '+end+' diff: '+Math.abs(buffer[end]-buffer[start]));
    for (var i = end-parseInt(len/2); i < end+len; i++) {
      diff = Math.abs(buffer[i]-buffer[start]);
      // console.log(diff)
      if (diff < bestMatch) {
        bestMatch = diff;
        bestMatchIndex = i;
      }
    }

    // len = Math.round(maxWaveSize * 0.025);
    // var diff1, diff2;
    // for (var i = 0; i < len; i++) {
    //   diff1 = Math.abs(buffer[end-i]-buffer[start]);
    //   diff2 = Math.abs(buffer[end+i]-buffer[start]);
    //   if (diff1 < bestMatch) {
    //     bestMatch = diff1;
    //     bestMatchIndex = end-i;
    //   }
    //   if (diff2 < bestMatch) {
    //     bestMatch = diff2;
    //     bestMatchIndex = end+i;
    //   }
    //   if (bestMatch < 0.001) {
    //     console.log('OK, good enough: '+bestMatch);
    //     break;
    //   }
    // }
    bestMatchIndex += (window.off || 0);
    console.log('Best End: '+bestMatchIndex+' diff: '+bestMatch);
    console.log('-- Sample: '+(start/sampleRate)+' - '+(bestMatchIndex/sampleRate));
    // console.log('Offset: '+(bestMatchIndex-end));
    // maxWaveSize = bestMatchIndex - start;
    // end = start + maxWaveSize * 10;

    // bestMatch = 1;
    // bestMatchIndex = end;
    // console.log('Expected End #2: '+end+' diff: '+Math.abs(buffer[end]-buffer[start]));
    // for (var i = end-parseInt(len/2); i < end+len; i++) {
    //   diff = Math.abs(buffer[i]-buffer[start]);
    //   if (diff < bestMatch) {
    //     bestMatch = diff;
    //     bestMatchIndex = i;
    //   }
    // }

    var pattern = buffer.slice(start, bestMatchIndex);
    // console.log('CLEARING: '+bestMatchIndex+' - '+pattern.length);
    // pattern.fill(0, bestMatchIndex-start, pattern.length);
    var diff = buffer[bestMatchIndex]-buffer[start];
    pattern[0] += diff;
    for (var i = 1; i < 50; i++) {
      pattern[i] += diff*(1-i/50);
    }


    for (var i = 1; i < 80; i++) {
      // pattern[pattern.length-i] += (buffer[start-i] - pattern[pattern.length-i])*(1-i/80);
    }

    // pattern[0] += diff;
    for (var i = 1; i < maxWaveSize; i++) {
      // pattern[i] = (1-i/maxWaveSize)*buffer[bestMatchIndex-maxWaveSize+i] + (i/maxWaveSize)*buffer[start+maxWaveSize+i];
    }

    // console.log(pattern)
    return {
      data: pattern,
      startIndex: start,
      endIndex: bestMatchIndex
    }


    var optimalBlock = maxWaveSize / 2;
    var block, val;
    var blocks = [];

    function addBlock(block) {
      var prev = blocks[blocks.length-1];
      if (prev) {
        prev.next = block;
        block.prev = prev;
      }
      blocks.push(block);
    }
    end = start + parseInt(maxWaveSize*1.1);
    for (var i = start; i < end; i++) {
      val = buffer[i];
      if (block) {
        if ((val > 0 && block.sum > 0) || (val < 0 && block.sum < 0)) {
          block.sum += val;
        } else {
          block.end = i;
          addBlock(block);
          block = null;
        }
      }
      if (!block) {
        block = {
          sum: val,
          polarity: val > 0? 1 : -1,
          start: i,
          end: -1
        }
      }
    }
    if (block) {
      block.end = end;
      addBlock(block);
    }
    console.log('Start: '+(start/sampleRate)+' End: '+(end/sampleRate))
    blocks.forEach(function(b, index) {
      var size = (b.end-b.start)/(end-start);
      console.log(b.sum.toFixed(2)+' '+(100*size).toFixed(2)+'%');
      if (size < 0.05) {
        console.log('Small Fragment')
      }
    });
  }
  */
  function waveDiff(buff1, buff2) {
    var diff = 0;
    for (var i = 0; i < buff1.length; i++) {
      diff += buff2[i]-buff1[i];
    }
    return diff;
  }
  AudioComposer.prototype.findWavePattern3 = function(note, ab, channel) {
    var buffer = ab.getChannelData(channel);
    var sampleRate = ab.sampleRate;
    var waveSize = parseInt(sampleRate * noteWaveLength(note));
    // var start = parseInt(2.3 * sampleRate);
    var start = parseInt(ab.length - 5*waveSize);

    // console.log('START: '+(start/sampleRate)+' of '+ab.duration)

    var info = analyzeSignal(buffer, start, parseInt(1.1*waveSize));
    var endStart = info.positiveIndex+1*waveSize-parseInt(0.04*waveSize);
    var end = analyzeSignal(buffer, endStart, parseInt(0.08*waveSize));


    end.positiveIndex = info.positiveIndex+waveSize;

    // var pattern = buffer.slice(start, start+waveSize);
    var pattern = buffer.slice(info.positiveIndex, end.positiveIndex);


    var len = parseInt(pattern.length * 0.05);
    // console.log('Smooth '+len)
    var diff = pattern[0] - pattern[pattern.length-1];
    // console.log('DIFF: '+diff)
    // create smooth transition with beginning
    for (var i = 0; i < len; i++) {
      pattern[pattern.length-i-1] += diff*(1-i/len);
    }

    // for (var i = 1; i < waveSize-1; i++) {
    //   pattern[i] = (pattern[i-1]+pattern[i+1])/2;
    // }

    // console.log('Wave Diff: '+waveDiff(pattern, buffer.subarray(end.positiveIndex, end.positiveIndex+pattern.length)));
    // console.log('Alg3: '+(info.positiveIndex/sampleRate)+' - '+(end.positiveIndex/sampleRate));
    return {
      data: pattern,
      startIndex: info.positiveIndex,
      endIndex: end.positiveIndex
    }
  }


  AudioComposer.prototype.enlarge = function(note, ab, duration) {
    var sampleRate = ab.sampleRate;
    var pattern = [];
    for (var ch = 0; ch < ab.numberOfChannels; ch++) {
    // for (var ch = 0; ch < 1; ch++) {
      pattern.push(this.findWavePattern3(note, ab, ch));
    }
    var repeats = Math.ceil((duration*sampleRate - pattern[0].startIndex)/pattern[0].data.length);
    // console.log('Repeats: '+repeats)
    var maxLength = Math.max.apply(null, pattern.map(function(p) {
      return p.startIndex+(repeats*p.data.length);
    }));

    var output = this.context.createBuffer(ab.numberOfChannels, maxLength, sampleRate);

    for (var ch = 0; ch < ab.numberOfChannels; ch++) {
      output.getChannelData(ch).set(ab.getChannelData(ch), 0);
      for (var i = 0, offset = pattern[ch].startIndex; i < repeats; i++) {
        // output.copyToChannel(pattern[ch].data, ch, offset);
        output.getChannelData(ch).set(pattern[ch].data, offset);
        offset += pattern[ch].data.length;
      }
      var dest = output.getChannelData(ch).subarray(pattern[ch].endIndex);
      for (var i = 0; i < dest.length; i++) {
        dest[i] *= 1-0.4*(i/dest.length)
      }
    }
    // if (ab.numberOfChannels === 2) {
      // output.getChannelData(1).set(output.getChannelData(0));
    // }

    // window.save = function() {
    //   var output2 = this.context.createBuffer(1, output.length, output.sampleRate);
    //   output2.getChannelData(0).set(output.getChannelData(0));
    //   var wav = audioBufferToWav(output2);
    //   var blob = new window.Blob([ new DataView(wav) ], {
    //     type: 'audio/wav'
    //   });
    //   saveAs(blob, 'sound.wav');
    // }.bind(this);
    return output;
  }

  AudioComposer.prototype.letRingSound = function(note, ab, duration) {
    var pattern = this.findWavePattern(note, ab);

    var repeats = Math.ceil(duration*ab.sampleRate/pattern.data.length);
    // console.log('repeats: '+repeats);
    var output = this.context.createBuffer(
      ab.numberOfChannels,
      repeats*pattern.data.length,
      ab.sampleRate
    );
    for (var i = 0, offset = 1; i < repeats; i++) {
      // output.copyToChannel(pattern.data, 0, offset-1);
      output.getChannelData(0).set(pattern.data, offset-1);
      offset += pattern.data.length;
    }

    // var output2 = this.context.createBuffer(1, output.length, output.sampleRate);
    // output2.getChannelData(0).set(output.getChannelData(0));
    // var wav = audioBufferToWav(output2);
    // var blob = new window.Blob([ new DataView(wav) ], {
    //   type: 'audio/wav'
    // });
    // saveAs(blob, 'sound.wav');
    return output;
  };

  /*
  function AudioArray() {
    var segments = [];
    return {
      segments,
      add (audio) {
        segments.push(audio);
      },
      last () {
        return segments[segments.length - 1];
      },
      play (startTime) {
        segments.forEach(audio => {
          audio.play(audio.startTime, audio.offset);
        });
      }
    }
  }
  */

  function audioJoin(audio1, audio2) {
    var sampleRate = audio1.source.buffer.sampleRate;
    var buffer1 = audio1.source.buffer.getChannelData(0);
    var buffer2 = audio2.source.buffer.getChannelData(0);

    var waveLength = soundWaveLength(audio1.sound);
    var searchMaxSize = parseInt(1.5*waveLength*sampleRate);

    var endIndex = parseInt(audio1.duration*sampleRate);
    var cross1 = analyzeSignal(buffer1, endIndex-parseInt(waveLength*sampleRate), searchMaxSize).crossIndex;
    var endOffset = (cross1 - endIndex)/sampleRate;
    // console.log('Audio1 end offset: '+endOffset);
    var fadeStartTime = audio1.endTime+endOffset;
    audio1.gain.setValueCurveAtTime(fadeOut(audio1.sound.volume), fadeStartTime, waveLength-0.001);
    audio1.gain.setValueAtTime(0.00001, fadeStartTime+waveLength);
    audio1.duration += endOffset + waveLength;
    audio1.endTime += endOffset + waveLength;

    // second sound
    waveLength = soundWaveLength(audio2.sound);
    searchMaxSize = parseInt(1.5*waveLength*sampleRate);
    var startIndex = parseInt(0.25*sampleRate);
    var cross2 = analyzeSignal(buffer2, startIndex, searchMaxSize).crossIndex;
    audio2.play(fadeStartTime, cross2/sampleRate);
    audio2.gain.setValueCurveAtTime(fadeIn(audio2.sound.volume), fadeStartTime, waveLength-0.0001);
    audio2.gain.setValueAtTime(audio2.sound.volume, fadeStartTime+waveLength);
  }

  function audioSlide(prevAudio, sound, curve, startTime, beatTime, samples) {
    var steps = Math.abs(sound.note.fret - sound.endNote.fret);
    var direction = (sound.note.fret > sound.endNote.fret)? -1 : 1;

    var audio = prevAudio;
    if (!audio) {
      audio = samples[0];
      audio.startTime = startTime;
      audio.duration = 0;
      audio.endTime = startTime;
    }
    var sampleRate = audio.source.buffer.sampleRate;

    var buffer = audio.source.buffer.getChannelData(0);
    var waveLength = fretWaveLength(sound.string, sound.note.fret);
    var searchMaxSize = parseInt(1.5 * waveLength * sampleRate);

    // console.log(curve[0]+' vs '+waveLength);
    var crossPointIndex = parseInt((audio.duration + curve[0]) * sampleRate);
    var info = analyzeSignal(buffer, crossPointIndex, searchMaxSize);
    var diff = info.crossIndex - crossPointIndex;

    // console.log(crossPointIndex+' vs '+info.crossIndex);
    crossPointIndex = info.crossIndex;
    audio.slide = {
      crossPointIndex: crossPointIndex,
      crossPointDuration: curve[0]+diff/sampleRate,
      nextStepDurationCorrection: -diff/sampleRate,
      crossPointTime: audio.startTime + crossPointIndex/sampleRate,
      // amplitude: info.absoluteValue*sound.volume,
      volume: prevAudio? prevAudio.slide? prevAudio.slide.volume : prevAudio.sound.volume : sound.volume
    };
    audio.slide.amplitude = info.absoluteValue*audio.slide.volume;

    // console.log('add duration: '+audio.slide.crossPointDuration);

    // console.log('first slide sound start time: '+startTime);
    // console.log('amplitude: '+info.absoluteValue);
    audio.gain.setValueAtTime(audio.slide.volume, startTime);
    audio.duration += audio.slide.crossPointDuration;
    audio.endTime += audio.slide.crossPointDuration;

    audio.duration2 = audio.duration;

    var step;
    for (var i = 0; i < steps; i += step) {
      waveLength = fretWaveLength(sound.string, sound.note.fret+((i+1)*direction));
      var wavesCount = ((audio.slide.nextStepDurationCorrection + curve[i+1]) / waveLength);
      if (wavesCount < 2.5 && i+1 < steps) {
        step = 2;
      } else {
        step = 1;
      }
      // console.log('Waves: {0} Step: {1}'.format(wavesCount, step));
      searchMaxSize = parseInt(1.5*waveLength*sampleRate);

      var nextAudio = samples[i+step];
      nextAudio.duration = 0;
      nextAudio.endTime = 0;
      // determine next's sound offset
      buffer = nextAudio.source.buffer.getChannelData(0);
      var nextBufferOffset = parseInt(0.45*sampleRate);
      info = analyzeSignal(buffer, nextBufferOffset, searchMaxSize);
      nextBufferOffset = info.crossIndex;

      var nextStepDuration = audio.slide.nextStepDurationCorrection+curve[i+1];
      if (step === 2) {
        nextStepDuration += curve[i+2];
      }
      var nextCrossPointIndex = nextBufferOffset + parseInt(nextStepDuration*averageStepRate[-step*direction]*sampleRate);
      // console.log('raw nextCrossPointIndex: '+nextCrossPointIndex);
      var nextStartRate = stepRate[-direction*step];
      // console.log((-step*direction)+' avg: '+averageStepRate[-step*direction]);
      info = analyzeSignal(buffer, nextCrossPointIndex, searchMaxSize); // maybe add small step back to search region
      diff = info.crossIndex - nextCrossPointIndex;
      nextCrossPointIndex = info.crossIndex;
      // console.log('nextStepDuration: {0} nextCrossPointIndex: {1} nextStartRate: {2}'.format(nextStepDuration, nextCrossPointIndex, nextStartRate));

      var volumeCorrection = audio.slide.amplitude/info.absoluteValue;
      nextAudio.slide = {
        crossPointIndex: nextCrossPointIndex,
        crossPointDuration: nextStepDuration + diff/sampleRate,
        nextStepDurationCorrection: -diff/sampleRate,
        crossPointTime: audio.slide.crossPointTime+nextStepDuration + diff/sampleRate,// relative to the begining of the whole slide
        amplitude: info.absoluteValue*volumeCorrection,
        volume: volumeCorrection,
        startRate: nextStartRate
      };

      // setup playback
      audio.duration += nextAudio.slide.crossPointDuration;
      audio.endTime += nextAudio.slide.crossPointDuration;
      audio.slide.endRate = stepRate[step*direction];

      audio.source.playbackRate.setValueAtTime(1, audio.slide.crossPointTime);
      audio.source.playbackRate.linearRampToValueAtTime(audio.slide.endRate, nextAudio.slide.crossPointTime);
      audio.gain.setValueAtTime(audio.slide.volume, audio.slide.crossPointTime);
      audio.gain.linearRampToValueAtTime(0.00001, nextAudio.slide.crossPointTime);
      // audio.gain.setValueCurveAtTime(fadeOut(audio.slide.volume), audio.slide.crossPointTime+0.0001, nextAudio.slide.crossPointDuration-0.0002);
      // audio.gain.setValueAtTime(0.00001, nextAudio.slide.crossPointTime);

      audio.play(audio.startTime, audio.offset);

      nextAudio.startTime = audio.slide.crossPointTime;
      nextAudio.source.playbackRate.setValueAtTime(nextAudio.slide.startRate, nextAudio.startTime);
      nextAudio.source.playbackRate.linearRampToValueAtTime(1, nextAudio.slide.crossPointTime);

      nextAudio.gain.setValueAtTime(0.00001, nextAudio.startTime);
      nextAudio.gain.linearRampToValueAtTime(nextAudio.slide.volume, nextAudio.slide.crossPointTime-0.0001);
      // nextAudio.gain.setValueCurveAtTime(fadeIn(nextAudio.slide.volume), nextAudio.startTime+0.0001, nextAudio.slide.crossPointDuration-0.0002);
      // nextAudio.gain.setValueAtTime(nextAudio.slide.volume, nextAudio.startTime+nextAudio.slide.crossPointDuration);
      // console.log('{0} fade in: at {1} duration {2}'.format(i, nextAudio.startTime, nextAudio.slide.crossPointDuration));
      nextAudio.offset = nextBufferOffset/sampleRate;
      nextAudio.duration = nextAudio.slide.crossPointDuration;
      nextAudio.endTime = nextAudio.slide.crossPointTime;
      audio = nextAudio;
    }

    audio.duration += curve[curve.length-1];//+0.1;
    audio.endTime += curve[curve.length-1];
    // audio.gain.setValueAtTime(audio.slide.volume, audio.slide.crossPointTime+0.0001);
    audio.play(audio.startTime, audio.offset);
    return audio;
  }

  window.AudioUtils = {
    join: audioJoin,
    audioSlide: audioSlide
  }

  return AudioComposer;
  }

})();
