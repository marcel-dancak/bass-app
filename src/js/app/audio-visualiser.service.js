(function() {
  'use strict';

  angular
    .module('bd.app')
    .factory('audioVisualiser', audioVisualiser);

  function audioVisualiser() {
    function AudioVisualiser() {
      this.beats = {};
      this.drawBeatIndex = -1;
      this.analyzeBeatIndex = -1;
    }

    AudioVisualiser.prototype.initializeBeat = function(index) {
      var canvasId = 'canvas_'+index;

      var beatData = this.beats[index];
      var canvas;
      if (beatData) {
        canvas = beatData.canvas;
      } else {
        canvas = document.getElementById(canvasId);
        beatData = {
          canvas: canvas,
          data: []
        };
        this.beats[index] = beatData;
      }

      this.width = canvas.offsetWidth;
      this.height = canvas.offsetHeight;
      canvas.setAttribute('width', this.width);
      canvas.setAttribute('height', this.height);
      beatData.x = 0;
      beatData.y = this.height/2;
      beatData.ctx = canvas.getContext("2d");
      beatData.ctx.fillStyle = 'rgb(240, 240, 240)';
      beatData.ctx.lineWidth = 1;
      beatData.ctx.strokeStyle = 'rgb(180, 0, 0)';
      beatData.frame = 0;
      beatData.lastFrame = 0;
      return beatData;
    }

    AudioVisualiser.prototype.redraw = function() {
      for (var name in this.beats) {
        var beat = this.beats[name];
        var ctx = beat.ctx;
        var width = beat.canvas.clientWidth;
        var height = beat.canvas.clientHeight;
        beat.canvas.setAttribute('width', width);
        beat.canvas.setAttribute('height', height);
        ctx.clearRect(0, 0, width, height);
        if (beat.lastFrame === 0) {
          continue;
        }
        var y;

        ctx.strokeStyle = 'rgb(180, 0, 0)';
        ctx.beginPath();

        var records = beat.data.length;
        var graphEnd = width;
        if (beat.lastFrameTime < beat.endTime) {
          graphEnd = width*(beat.lastFrameTime-beat.startTime)/(beat.endTime-beat.startTime);
        }
        for (var i = 0; i < graphEnd; i++) {
          var recordIndex = parseInt(i*(records/graphEnd));
          var v = beat.data[recordIndex] / 128.0;
          y = v * height / 2;
          if (i === 0) {
            ctx.moveTo(i, y);
          } else {
            ctx.lineTo(i, y);
          }
        }
        ctx.stroke();
      }
    };

    AudioVisualiser.prototype.initialize = function(context, audioPlayer) {
      var _this = this;
      this.context = context;
      this.enabled = false;

      window.addEventListener("resize", this.redraw.bind(this));

      // TODO: destroy previous beats data
      // this.beats = {};
      // analyser.context.createAudioWorker("js/app/audio_worker.js").then(function(factory) {
      //   var workerNode = factory.createNode(1, 1);
      //   audioPlayer.bass.audio.connect(workerNode);
      //   workerNode.connect(analyser);
      // });


      audioPlayer.bass.audio.connect(context.destination);

      // this.audioProcessor = context.createScriptProcessor(512, 1, 1);
      // this.sampleLength = 0.0125;

      this.audioProcessor = context.createScriptProcessor(512, 1, 1);
      this.sampleLength = 0.0124;
      this.saveRate = 8;
      audioPlayer.bass.audio.connect(this.audioProcessor);

      this.audioProcessor.onaudioprocess = function(audioProcessingEvent) {
        // console.log('onaudioprocess');
        var currentTime = audioProcessingEvent.playbackTime;
        if (_this.enabled && _this.analyzeBeatIndex !== -1) {
          var inputBuffer = audioProcessingEvent.inputBuffer;
          var inputData = inputBuffer.getChannelData(0);
          var beatDataSize = inputData.length;

          var beat = _this.beats[_this.analyzeBeatIndex];

          if (currentTime >= beat.endTime) {
            var nextBeat;
            var beatTime = 60/_this.bpm;
            nextBeat = _this.initializeBeat(_this.nextBeatIndex(_this.analyzeBeatIndex));
            nextBeat.startTime = beat.endTime;
            nextBeat.endTime = nextBeat.startTime + beatTime;

            var splitPoint = (currentTime - beat.endTime) / _this.sampleLength;
            beatDataSize = parseInt(inputData.length*splitPoint);
            var destIndex = 1;
            for (var i = beatDataSize; i < inputData.length; i+=_this.saveRate) {
              nextBeat.data[nextBeat.lastFrame+destIndex] = 128+parseInt(inputData[i]*128);
              destIndex++;
            }
            nextBeat.lastFrame += destIndex;
            nextBeat.lastFrameTime = currentTime;
          }

          var destIndex = 1;
          for (var i = 0; i < beatDataSize; i+=_this.saveRate) {
            beat.data[beat.lastFrame+destIndex] = 128+parseInt(inputData[i]*128);
            destIndex++;
          }
          beat.lastFrame += destIndex;
          beat.lastFrameTime = nextBeat? beat.endTime : currentTime;
          if (nextBeat) {
            console.log('BEAT size: '+beat.data.length);
            _this.analyzeBeatIndex = _this.nextBeatIndex(_this.analyzeBeatIndex);
          }

        } else {
          console.log('stopping loop');
          _this.audioProcessor.disconnect();
        }
      }
    };

    AudioVisualiser.prototype.nextBeatIndex = function(index) {
      return (index+1) % this.beatsCount;
    };

    AudioVisualiser.prototype.setBeatsCount = function(count) {
      this.beatsCount = count;
    };

    AudioVisualiser.prototype.setInputSource = function(context, source) {
      // this.inputSource = source;
      this.inputAnalyser = context.createAnalyser();
      this.inputAnalyser.fftSize = 4096;
      source.connect(this.inputAnalyser);
      this.inputAnalyser.connect(context.destination);
    };


    AudioVisualiser.prototype.clear = function() {
      for (name in this.beats) {
        var canvas = this.beats[name].canvas;
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
        this.beats[name].lastFrame = 0;
      }
    };

    AudioVisualiser.prototype.beatSync = function(barIndex, beatIndex, bpm) {
      // console.log('BEAT Sync '+bpm);
      if (barIndex === 1 && beatIndex === 1) {
        setTimeout(function() {
          var name;
          for (name in this.beats) {
            // skip first beat in bar, it will be cleared automaticaly
            if (name !== '0') {
              var canvas = this.beats[name].canvas;
              this.beats[name].lastFrame = 0;
              this.beats[name].ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
            }
          }
        }.bind(this), 60);


        this.bpm = bpm;
        this.drawBeatIndex = 0;
        this.analyzeBeatIndex = 0;

        var beatTime = 60/bpm;
        var beatStart = this.context.currentTime;
        var beat = this.initializeBeat(this.drawBeatIndex);
        beat.startTime = beatStart;
        beat.endTime = beatStart + beatTime;
        // setTimeout(function() {
        //   this.audioProcessor.connect(this.context.destination);
        // }.bind(this), 60);
        this.audioProcessor.connect(this.context.destination);
        requestAnimationFrame(this.draw.bind(this));
      }
    };

    AudioVisualiser.prototype.draw = function() {
      var beat = this.beats[this.drawBeatIndex];

      if (beat) {

        var newFrames = beat.lastFrame-beat.frame;
        var lastDraw = this.analyzeBeatIndex > this.drawBeatIndex;
        if (newFrames > 1024/this.saveRate || lastDraw) {
          // console.log('frames available: ' + newFrames);
          var ctx = beat.ctx;

          ctx.beginPath();
          ctx.moveTo(beat.x, beat.y);

          var beatWidth = this.width;
          var beatTime = beat.endTime-beat.startTime;
          var blockPx = (this.sampleLength/beatTime)*(beatWidth);
          var steps = (newFrames*this.saveRate / 512)*blockPx;
          steps = parseInt(steps);

          for (var i = 0; i < steps; i++) {
            var dataIndex = beat.frame+parseInt((i+1)*(newFrames/steps))-1;
            beat.y = beat.data[dataIndex] * this.height / 256.0;
            beat.x++;
            ctx.lineTo(beat.x, beat.y);
          }
          ctx.stroke();
          beat.frame = beat.lastFrame;
        }
        if (lastDraw) {
          // console.log(beat.x + ' of '+beatWidth);
        }
        if (beat.x >= beatWidth || lastDraw) {
          this.drawBeatIndex = this.nextBeatIndex(this.drawBeatIndex);
        }
      }
      if (this.enabled) {
        requestAnimationFrame(this.draw.bind(this));
      }
    };

    return new AudioVisualiser();
  };
})();