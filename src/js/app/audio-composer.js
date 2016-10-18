(function() {
  'use strict';

  angular
    .module('bd.app')
    .value('AudioComposer', AudioComposer);


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


  AudioComposer.prototype.offlineSoundAudio = function(context, sound, startTime, index) {
    var resources = this.player._getSoundHandler(sound).getResources(sound);
    var audioData = resources? this.player.bufferLoader.loadResource(resources[index || 0]) : null;

    if (audioData) {

      var source = context.createBufferSource();
      var gain = context.createGain();
      var filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = 0.0;

      source.connect(gain);
      // source.connect(filter);
      // filter.connect(gain);
      gain.connect(context.destination);
      source.buffer = audioData;
      return {
        id: index || 0,
        sound: sound,
        source: source,
        gain: gain.gain,
        filter: filter,
        output: gain,
        startTime: startTime,
        endTime: startTime,
        duration: 0,
        offset: 0
      }
    } else {
      console.log('error '+resources);
    }
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


  AudioComposer.prototype.createSlide = function(track, prevAudio, sound, curve, startTime, beatTime, timeSignature) {
    var st = performance.now();

    var sounds = [];
    var steps = Math.abs(sound.note.fret - sound.note.slide.endNote.fret);
    var direction = (sound.note.fret > sound.note.slide.endNote.fret)? -1 : 1;

    var audio = prevAudio || this.player.createSoundAudio(track, sound, startTime, 0);
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
      volume: prevAudio && prevAudio.slide? prevAudio.slide.volume : sound.volume
    };
    audio.slide.amplitude = info.absoluteValue*audio.slide.volume;

    // console.log('add duration: '+audio.slide.crossPointDuration);

    // console.log('first slide sound start time: '+startTime);
    // console.log('amplitude: '+info.absoluteValue);
    audio.gain.setValueAtTime(audio.slide.volume, startTime);
    audio.duration += audio.slide.crossPointDuration;
    audio.endTime += audio.slide.crossPointDuration;

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

      var nextAudio = this.player.createSoundAudio(track, sound, 0, i+step);
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



  AudioComposer.prototype.offlineSlide = function(sound, curve, startTime, beatTime, timeSignature) {
    var offlineCtx = new OfflineAudioContext(1, 44100*2, 44100);
    var output = offlineCtx.createBufferSource();
    var st = performance.now();

    var steps = Math.abs(sound.note.slide);
    var direction = (sound.note.slide > 0)? 1 : -1;


    var audio = this.offlineSoundAudio(offlineCtx, sound, 0, 0);
    var buffer = audio.source.buffer.getChannelData(0);
    var waveLength = fretWaveLength(sound.string, sound.note.fret);
    var searchMaxSize = parseInt(1.5*waveLength*44100);


    var crossPointIndex = parseInt(curve[0]*44100);
    var info = analyzeSignal(buffer, crossPointIndex, searchMaxSize);
    var diff = info.crossIndex - crossPointIndex;
    crossPointIndex = info.crossIndex;
    audio.startTime = 0;
    audio.slide = {
      crossPointIndex: crossPointIndex,
      crossPointDuration: curve[0]+diff/44100,
      nextStepDurationCorrection: -diff/44100,
      crossPointTime: crossPointIndex/44100,
      amplitude: info.absoluteValue*0.75,
      volume: 0.75
    }
    audio.filter.frequency.setValueAtTime(10000, audio.startTime);
    audio.gain.setValueAtTime(audio.slide.volume, audio.startTime);

    console.log('slide start: '+audio.slide.crossPointTime);

    var step = 1;
    for (var i = 1; i <= steps; i+=step) {
      waveLength = fretWaveLength(sound.string, sound.note.fret+(i*direction));
      var wavesCount = ((audio.slide.nextStepDurationCorrection + curve[i]) / waveLength);
      if (wavesCount < 2 && i < steps) {
        step = 2;
      } else {
        step = 1;
      }
      console.log('Step: '+step);
      searchMaxSize = parseInt(1.5*waveLength*44100);

      var nextAudio = this.offlineSoundAudio(offlineCtx, sound, 0, i);
      // determine next's sound offset
      buffer = nextAudio.source.buffer.getChannelData(0);
      var nextBufferOffset = parseInt(0.45*44100);
      info = analyzeSignal(buffer, nextBufferOffset, searchMaxSize);
      nextBufferOffset = info.crossIndex;

      var nextStepDuration = audio.slide.nextStepDurationCorrection+curve[i];
      if (step === 2) {
        nextStepDuration += curve[i+1];
      }
      var nextCrossPointIndex = nextBufferOffset + parseInt(nextStepDuration*averageStepRate[-step*direction]*44100);
      console.log('raw nextCrossPointIndex: '+nextCrossPointIndex);
      var nextStartRate = stepRate[-direction*step];
      console.log((-step*direction)+' avg: '+averageStepRate[-step*direction]);
      info = analyzeSignal(buffer, nextCrossPointIndex, searchMaxSize); // maybe add small step back to search region
      diff = info.crossIndex - nextCrossPointIndex;
      nextCrossPointIndex = info.crossIndex;
      console.log('nextStepDuration: {0} nextCrossPointIndex: {1} nextStartRate: {2}'.format(nextStepDuration, nextCrossPointIndex, nextStartRate));

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

      // configure cross out parameters
      audio.slide.endRate = stepRate[step*direction];
      /*
      var endIndex = audio.slide.crossPointIndex+parseInt(((1+audio.slide.endRate)/2)*nextAudio.slide.crossPointDuration*44100);
      info = analyzeSignal(audio.slide.buffer, endIndex-searchMaxSize, searchMaxSize);
      var diff = (info.crossIndex - endIndex)/44100;
      audio.slide.buffer.fill(0, info.crossIndex, info.crossIndex+searchMaxSize);
      */

      // setup playback
      audio.source.playbackRate.setValueAtTime(1, audio.slide.crossPointTime);
      audio.source.playbackRate.linearRampToValueAtTime(audio.slide.endRate, nextAudio.slide.crossPointTime);
      audio.gain.setValueCurveAtTime(fadeOut(audio.slide.volume), audio.slide.crossPointTime, nextAudio.slide.crossPointDuration);
      audio.gain.setValueAtTime(0.0001, nextAudio.slide.crossPointTime+0.0001);

      // if (i === 5) audio.source.start(audio.startTime, audio.offset, 1);
      audio.source.start(audio.startTime, audio.offset, 1);


      nextAudio.startTime = audio.slide.crossPointTime;
      nextAudio.source.playbackRate.setValueAtTime(nextAudio.slide.startRate, nextAudio.startTime);
      nextAudio.source.playbackRate.linearRampToValueAtTime(1, nextAudio.slide.crossPointTime);
      nextAudio.gain.setValueCurveAtTime(fadeIn(nextAudio.slide.volume), nextAudio.startTime, nextAudio.slide.crossPointDuration);
      nextAudio.offset = nextBufferOffset/44100;
      // nextAudio.filter.frequency.setValueAtTime(5000, nextAudio.startTime);
      audio = nextAudio;
    }

    if (nextAudio) {
      nextAudio.gain.setValueAtTime(0.0001, nextAudio.slide.crossPointTime+curve[curve.length-1]+nextAudio.slide.nextStepDurationCorrection);
      nextAudio.source.start(nextAudio.startTime, nextAudio.offset, 1);
    }
    // console.log(timing);
    console.log('config. time: '+(performance.now()-st));
    return offlineCtx.startRendering();
  }


  AudioComposer.prototype.test = function() {
    var beatTime = 1;
    var timeSignature = {top: 4, bottom: 4};
    var sound = {
      style: 'slap',
      string: 'A',
      note: {
        fret: 0,
        type: 'slide',
        slide: 8
      },
      noteLength: {
        length: 1/4,
        beatLength: 1/4
      }
    };
    var duration = this.player.noteDuration(sound, beatTime, timeSignature);

    var steps = Math.abs(sound.note.slide);
    var timing = new Array(steps+2);
    timing[0] = 0.2*duration;
    timing[timing.length-1] = 0.2*duration;
    var stepDuration = (duration-timing[0]-timing[timing.length-1])/steps;
    timing.fill(stepDuration, 1, timing.length-1);

    console.log(timing);
    var resources = this.player._getSoundHandler(sound).getResources(sound);

    this.player.bufferLoader.loadResources(resources, function() {
      // var audio = this.slide_orig(sound, timing, this.context.currentTime+0.1, beatTime, timeSignature);

      // audio.gain.setValueAtTime(1, audio.startTime);
      // audio.gain.setValueAtTime(1, audio.startTime+duration-0.015);
      // audio.gain.linearRampToValueAtTime(0.0001, audio.startTime+duration);
      // audio.source.start(audio.startTime, 0, 3);

      // var wav = audioBufferToWav(audio.source.buffer);
      // var blob = new window.Blob([ new DataView(wav) ], {
      //   type: 'audio/wav'
      // });
      // saveAs(blob, 'slide.wav');

      var output = this.context.createBufferSource();
      var start = performance.now();
      this.offlineSlide(sound, timing, 0, beatTime, timeSignature).then(function(renderedBuffer) {
        console.log('---- rendered ----- '+(performance.now()-start));
        output.buffer = renderedBuffer;
        output.connect(this.context.destination);
        output.start(this.context.currentTime+0.1, 0, 2);

        var wav = audioBufferToWav(renderedBuffer);
        var blob = new window.Blob([ new DataView(wav) ], {
          type: 'audio/wav'
        });
        // saveAs(blob, 'slide.wav');

      }.bind(this));

    }.bind(this));
    console.log(resources);
  };


  function findBeginning(buffer, offset, threshold) {
    var end = buffer.length;
    var index = offset;
    var value;
    for (var i = offset; i < end; i += 10) {
      value = buffer[i];
      if (value > threshold) {
        index = i;
        break;
      }
    }
    return findCrossPoint(buffer, index);
  };

  AudioComposer.prototype.generateSamples = function(filename, string, startFret) {
    console.log('generateSamples');
    var context = new OfflineAudioContext(1, 44100*10, 44100);

    var bufferLoader = new BufferLoader(context, '/bass-records/');
    bufferLoader.format = 'wav';
    bufferLoader.loadResource(filename, function(audioData) {
      console.log('sound loaded');
      var source = context.createBufferSource();
      source.buffer = audioData;
      var buffer = source.buffer.getChannelData(0);

      var offsets = [];
      var start = 0;
      var blockSize = 22050;
      var info;

      for (var i = 0; i < 13; i++) {
        info = analyzeSignal(buffer, start, blockSize);
        while (info.absoluteValue < 0.2) {
          start += blockSize;
          info = analyzeSignal(buffer, start, blockSize);
        }
        start = findBeginning(buffer, start, 0.2);
        var endIndex = analyzeSignal(buffer, start+7*44100, parseInt(0.024*44100)).crossIndex;
        offsets.push([start, endIndex]);

        start = endIndex;
        info = analyzeSignal(buffer, start, blockSize);
        while (info.absoluteValue > 0.2) {
          start += blockSize;
          info = analyzeSignal(buffer, start, blockSize);
        }
      }
      console.log(offsets);

      for (var sampleIndex = 0; sampleIndex < offsets.length; sampleIndex++) {
        var start = offsets[sampleIndex][0];
        var end = offsets[sampleIndex][1];

        var sampleContext = new OfflineAudioContext(1, end - start, 44100);
        var source = sampleContext.createBufferSource();
        source.connect(sampleContext.destination);
        source.buffer = audioData;
        sampleContext.fret = startFret + sampleIndex;

        source.start(0, start/44100, end/44100-start/44100);
        sampleContext.startRendering().then(function(renderedBuffer) {
          var wav = audioBufferToWav(renderedBuffer);
          var blob = new window.Blob([ new DataView(wav) ], {
            type: 'audio/wav'
          });
          saveAs(blob, '{0}{1}.wav'.format(string, this.fret));
        }.bind(sampleContext));
      }

    }.bind(this));
  }

})();