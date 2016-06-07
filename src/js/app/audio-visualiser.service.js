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
      beatData.complete = 0;
      return beatData;
    }

    AudioVisualiser.prototype.initialize = function(context, audioPlayer) {
      var _this = this;
      this.context = context;
      this.enabled = false;

      // window.addEventListener("resize", this.redraw.bind(this));

      audioPlayer.bass.audio.connect(context.destination);

      this.audioProcessor = context.createScriptProcessor(512, 1, 1);
      this.saveRate = 8;
      audioPlayer.bass.audio.connect(this.audioProcessor);

      this.audioProcessor.onaudioprocess = function(audioProcessingEvent) {
        // console.log('onaudioprocess');
        var currentTime = audioProcessingEvent.playbackTime-0.012;
        if (_this.enabled && _this.analyzeBeatIndex !== -1) {
          var inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
          var beatDataSize = inputData.length;

          var beat = _this.beats[_this.analyzeBeatIndex];
          var beatTime = 60/_this.bpm;

          if (currentTime >= beat.endTime) {
            var nextBeat;
            nextBeat = _this.initializeBeat(_this.nextBeatIndex(_this.analyzeBeatIndex));
            nextBeat.startTime = beat.endTime;
            nextBeat.endTime = nextBeat.startTime + beatTime;

            var splitPoint = 1 - (currentTime - beat.endTime) / 0.0117;
            beatDataSize = parseInt(inputData.length*splitPoint);
            var destIndex = 0;
            for (var i = beatDataSize; i < inputData.length; i+=_this.saveRate) {
              destIndex++;
              nextBeat.data[nextBeat.lastFrame+destIndex] = 128+parseInt(inputData[i]*128);
            }
            nextBeat.lastFrame += destIndex;
            nextBeat.lastFrameTime = currentTime;
            nextBeat.complete = (currentTime - beat.startTime) / beatTime;
          }

          var destIndex = 0;
          for (var i = 0; i < beatDataSize; i+=_this.saveRate) {
            destIndex++;
            beat.data[beat.lastFrame+destIndex] = 128+parseInt(inputData[i]*128);
          }
          beat.lastFrame += destIndex;
          beat.lastFrameTime = nextBeat? beat.endTime : currentTime;
          beat.complete = nextBeat? 1 : (currentTime - beat.startTime) / beatTime;
          if (nextBeat) {
            // console.log('BEAT size: '+beat.data.length);
            _this.analyzeBeatIndex = _this.nextBeatIndex(_this.analyzeBeatIndex);
            nextBeat.y = beat.data[beat.data.length-1];
            nextBeat.y = 0;
          }
        }
      };
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

    AudioVisualiser.prototype.activate = function() {
      this.enabled = true;
      this.analyzeBeatIndex = -1;
      this.audioProcessor.connect(this.context.destination);
    };

    AudioVisualiser.prototype.deactivate = function() {
      this.enabled = false;
      this.audioProcessor.disconnect();
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
        requestAnimationFrame(this.draw.bind(this));
      }
    };

    AudioVisualiser.prototype.draw = function() {
      var beat = this.beats[this.drawBeatIndex];
      if (beat) {

        var newFrames = beat.lastFrame-beat.frame;
        if (newFrames > 1024/this.saveRate || beat.complete === 1) {
          // console.log('frames available: ' + newFrames);
          var ctx = beat.ctx;

          ctx.beginPath();
          ctx.moveTo(beat.x, beat.y);

          var beatWidth = this.width;
          var steps = parseInt(Math.round(beatWidth * beat.complete - beat.x));

          for (var i = 0; i < steps; i++) {
            var dataIndex = beat.frame+parseInt((i+1)*(newFrames/steps))-1;
            beat.y = beat.data[dataIndex] * this.height / 256.0;
            beat.x++;
            ctx.lineTo(beat.x, beat.y);
          }
          ctx.stroke();
          beat.frame = beat.lastFrame;
        }
        if (beat.x >= beatWidth) {
          this.drawBeatIndex = this.nextBeatIndex(this.drawBeatIndex);
          var nextBeat = this.beats[this.drawBeatIndex];
          if (nextBeat) {
            nextBeat.y = beat.y;
          }
        }
      }
      if (this.enabled) {
        requestAnimationFrame(this.draw.bind(this));
      }
    };

    AudioVisualiser.prototype.redraw = function() {
      var prevBeat;
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

        ctx.strokeStyle = 'rgb(180, 0, 0)';
        ctx.beginPath();
        if (prevBeat) {
          ctx.moveTo(0, prevBeat.y);
        } else {
          ctx.moveTo(0, height/2);
        }

        var records = beat.lastFrame;
        var graphEnd = parseInt(width * beat.complete);
        for (var i = 1; i <= graphEnd; i++) {
          var recordIndex = parseInt(i*(records/graphEnd));
          var v = beat.data[recordIndex] / 128.0;
          beat.y = v * height / 2;
          ctx.lineTo(i, beat.y);
        }
        ctx.stroke();
        prevBeat = beat;
      }
    };

    return new AudioVisualiser();
  };
})();