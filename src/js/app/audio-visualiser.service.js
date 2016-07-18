(function() {
  'use strict';

  angular
    .module('bd.app')
    .factory('audioVisualiser', audioVisualiser);

  function audioVisualiser() {
    function AudioVisualiser() {
      this.beats = [];
      this.drawBeatIndex = -1;
      this.analyzeBeatIndex = -1;
      this.lastInitBeatsCount = 0;
    }

    AudioVisualiser.prototype.initializeBeat = function(index) {
      var beat = this.beats[index];
      if (!beat) {
        beat = {
          data: []
        };
        this.beats[index] = beat;
      }
      if (!beat.canvas) {
        var canvasId = 'canvas_'+index;
        beat.canvas = document.getElementById(canvasId);
      }

      beat.ctx = beat.canvas.getContext("2d");
      beat.ctx.fillStyle = 'rgb(240, 240, 240)';
      beat.ctx.lineWidth = 1;
      beat.ctx.strokeStyle = 'rgb(180, 0, 0)';

      beat.index = index;
      beat.width = beat.canvas.offsetWidth;
      beat.height = beat.canvas.offsetHeight;
      beat.canvas.setAttribute('width', beat.width);
      beat.canvas.setAttribute('height', beat.height);
      beat.x = 0;
      beat.y = beat.height/2;
      beat.frame = 0;
      beat.lastFrame = 0;
      beat.complete = 0;
      return beat;
    }

    AudioVisualiser.prototype.initialize = function(context, input) {
      var _this = this;
      this.context = context;
      this.input = input;
      this.enabled = false;

      // window.addEventListener("resize", this.redraw.bind(this));

      this.audioProcessor = context.createScriptProcessor(512, 1, 1);
      this.saveRate = 8;

      this.audioProcessor.onaudioprocess = function(audioProcessingEvent) {
        // console.log('onaudioprocess');
        var currentTime = audioProcessingEvent.playbackTime-0.0117;
        if (_this.enabled && _this.analyzeBeatIndex !== -1) {
          var beat = _this.beats[_this.analyzeBeatIndex];
          if (!beat || !beat.startTime || (audioProcessingEvent.playbackTime-beat.startTime) < 0) {
            return;
          };

          var inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
          var beatDataSize = inputData.length;
          var beatTime = beat.endTime - beat.startTime;

          if (currentTime >= beat.endTime) {
            var nextBeat;
            nextBeat = _this.beats[_this.nextBeatIndex(_this.analyzeBeatIndex)];
            // nextBeat.startTime = beat.endTime;
            // nextBeat.endTime = nextBeat.startTime + beatTime;

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
      var next = index+1;
      var lastBeat = this.lastBeat || this.beatsCount-1;
      var firstBeat = this.firstBeat || 0;
      if (next > lastBeat) {
        next = firstBeat;
      }
      return next;
    };

    AudioVisualiser.prototype.setBeatsCount = function(count) {
      this.beatsCount = count;
    };

    AudioVisualiser.prototype.clear = function() {
      this.beats.forEach(function(beat) {
        beat.ctx.clearRect(0, 0, beat.canvas.offsetWidth, beat.canvas.offsetHeight);
        beat.lastFrame = 0;
      });
    };

    AudioVisualiser.prototype.activate = function() {
      this.enabled = true;
      this.drawing = false;
      this.analyzeBeatIndex = -1;
      // console.log('activate visualizer');
      this.input.connect(this.audioProcessor);
      this.audioProcessor.connect(this.context.destination);

      var reinitialize = this.lastInitBeatsCount !== this.beatsCount;
      for (var i = 0; i < this.beatsCount; i++) {
        var beat = this.beats[i];
        if (beat && beat.canvas && (reinitialize || !document.contains(beat.canvas))) {
          delete beat.ctx;
          delete beat.canvas;
        }
        this.initializeBeat(i);
      }
      this.lastInitBeatsCount = this.beatsCount;
      // console.log(this.beats);
    };

    AudioVisualiser.prototype.deactivate = function() {
      this.enabled = false;
      this.input.disconnect(this.audioProcessor);
      this.audioProcessor.disconnect(this.context.destination);
    };

    AudioVisualiser.prototype.beatSync = function(evt) {
      // console.log('BEAT Sync: '+evt.flatIndex);
      var beat = this.beats[evt.flatIndex];
      beat.startTime = evt.playbackActive? evt.startTime : -1;
      beat.endTime = evt.endTime;
      beat.lastFrame = 0;
      beat.frame = 0;

      // console.log(beat);

      if (!this.drawing) {
        this.drawing = true;
        this.drawBeatIndex = evt.flatIndex;
        this.analyzeBeatIndex = evt.flatIndex;

        var delay = 1000*(evt.startTime-this.context.currentTime);
        // console.log('Start drawing in '+delay);
        if (delay > 0) {
          setTimeout(this.draw.bind(this), delay);
        } else {
          this.draw();
          // requestAnimationFrame(this.draw.bind(this));
        }
      }
    };

    AudioVisualiser.prototype.draw = function() {
      var beat = this.beats[this.drawBeatIndex];
      if (beat) {
        var firstBeat = this.firstBeat || 0;
        if (this.drawBeatIndex === firstBeat && beat.x === 0) {
          // console.log('FIRST DRAW: '+this.beatsCount);
          beat.ctx.clearRect(0, 0, beat.canvas.offsetWidth, beat.canvas.offsetHeight);
          for (var i = firstBeat+1; i < this.beatsCount; i++) {
            var b = this.beats[i];
            if (b && b.ctx && b.lastFrame) {
              // console.log('clearing beat canvas '+i);
              b.ctx.clearRect(0, 0, b.canvas.offsetWidth, b.canvas.offsetHeight);
              b.lastFrame = 0;
            }
          }
        }
        var newFrames = beat.lastFrame-beat.frame;
        if (newFrames > 1024/this.saveRate || beat.complete === 1) {
          // console.log('frames available: ' + newFrames);
          // console.log(beat.data);
          var ctx = beat.ctx;
          ctx.strokeStyle = 'rgb(180, 0, 0)';

          ctx.beginPath();
          ctx.moveTo(beat.x, beat.y);

          var beatWidth = beat.width;
          var steps = parseInt(Math.round(beatWidth * beat.complete - beat.x));
          for (var i = 0; i < steps; i++) {
            var dataIndex = beat.frame+parseInt((i+1)*(newFrames/steps))-1;
            beat.y = beat.data[dataIndex] * beat.height / 256.0;
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
            if (nextBeat.startTime !== -1) {
              nextBeat.x = 0;
              nextBeat.y = beat.y;
            } else {
              console.log('stop');
              this.enabled = false;
            }
          }
        }
      }
      if (this.enabled) {
        requestAnimationFrame(this.draw.bind(this));
      }
    };

    AudioVisualiser.prototype.redrawBeat = function(beat) {
      var ctx = beat.ctx;
      ctx.clearRect(0, 0, beat.width, beat.height);
      if (beat.lastFrame === 0) {
        return;
      }

      ctx.strokeStyle = 'rgb(180, 0, 0)';
      ctx.beginPath();
      var prevBeat = this.beats[beat.index-1];
      if (prevBeat && prevBeat.complete === 1) {
        ctx.moveTo(0, prevBeat.y);
      } else {
        ctx.moveTo(0, beat.height/2);
      }

      var records = beat.lastFrame;
      var graphEnd = parseInt(beat.width * beat.complete);
      for (var i = 1; i <= graphEnd; i++) {
        var recordIndex = parseInt(i*(records/graphEnd));
        var v = beat.data[recordIndex] / 128.0;
        beat.y = v * beat.height / 2;
        ctx.lineTo(i, beat.y);
      }
      beat.x = graphEnd;
      ctx.stroke();
    };

    AudioVisualiser.prototype.updateSize = function() {
      for (var i = 0; i < this.beatsCount; i++) {
        var beat = this.beats[i];
        if (beat.width !== beat.canvas.offsetWidth) {
          // console.log('resize '+beat.width+' -> '+beat.canvas.offsetWidth);
          beat.width = beat.canvas.offsetWidth;
          beat.height = beat.canvas.offsetHeight;
          beat.canvas.setAttribute('width', beat.width);
          this.redrawBeat(beat);
        }
      }
    };

    return new AudioVisualiser();
  };
})();