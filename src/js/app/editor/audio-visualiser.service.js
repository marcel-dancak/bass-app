(function() {
  'use strict';

  angular
    .module('bd.app')
    .factory('audioVisualiser', audioVisualiser);

  function audioVisualiser(context, swiperControl) {
    function AudioVisualiser() {
      this.beats = [];
      this.drawBeatIndex = -1;
      this.analyzeBeatIndex = -1;
      this._initialzie();
    }

    AudioVisualiser.prototype.initializeBeat = function(evt) {
      var index = evt.flatIndex;
      var beat = this.beats[index];
      if (!beat) {
        beat = {
          data: []
        };
        this.beats[index] = beat;
      }

      if (!beat.canvas) {
        var beatWrapperElem = swiperControl.getBeatElem(evt.bar, evt.beat).parentElement;
        beat.canvas = beatWrapperElem.querySelector('canvas');
        beat.ctx = beat.canvas.getContext("2d");
      }

      beat.ctx.fillStyle = 'rgb(240, 240, 240)';
      beat.ctx.lineWidth = 1;
      beat.ctx.strokeStyle = 'rgb(180, 0, 0)';

      beat.index = index;

      // update 'width' and 'height' canvas attributes only when needed
      if (beat.width !== beat.canvas.offsetWidth) {
        beat.width = beat.canvas.offsetWidth;
        beat.canvas.setAttribute('width', beat.width);
      }
      if (beat.height !== beat.canvas.offsetHeight) {
        beat.height = beat.canvas.offsetHeight;
        beat.canvas.setAttribute('height', beat.height);
      }

      beat.x = 0;
      beat.y = beat.height/2;
      beat.frame = 0;
      beat.lastFrame = 0;
      beat.complete = 0;
      // beat.nextBeatIndex will be corrected in beatSynch call
      beat.nextBeatIndex = evt.flatIndex + 1;

      return beat;
    }

    AudioVisualiser.prototype._initialzie = function() {
      var _this = this;
      this.enabled = false;

      // window.addEventListener("resize", this.redraw.bind(this));

      this.audioProcessor = context.createScriptProcessor(512, 1, 1);
      this.saveRate = 8;

      // var counter = 0;
      // var pitch = new PitchAnalyzer(44100);

      this.audioProcessor.onaudioprocess = function(audioProcessingEvent) {
        // console.log('onaudioprocess');
        var currentTime = audioProcessingEvent.playbackTime-0.0117;
        if (_this.enabled && _this.analyzeBeatIndex !== -1) {
          var beat = _this.beats[_this.analyzeBeatIndex];
          if (!beat || !beat.startTime || (audioProcessingEvent.playbackTime-beat.startTime) < 0) {
            return;
          };
          // console.log('sample');
          var inputData = audioProcessingEvent.inputBuffer.getChannelData(0);

          /* Copy samples to the internal buffer */
          /*
          pitch.input(inputData);
          counter++;
          if (counter === 8) {
            pitch.process();
            var tone = pitch.findTone(25, 600);
            if (tone) {
              var f = Math.min.apply(null, pitch.tones.map(function(tone) {
                return tone.freq;
              }));
              if (f < 25) {
                console.log(pitch.tones);
              }
              // console.log(tone);
            }
            counter = 0;
          }
          */
          var beatDataSize = inputData.length;
          var beatTime = beat.endTime - beat.startTime;

          if (currentTime >= beat.endTime) {
            var nextBeat = _this.beats[beat.nextBeatIndex];
            if (nextBeat === undefined) {
              return; // wait for next beat sync
            }
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
            _this.analyzeBeatIndex = beat.nextBeatIndex;
            nextBeat.y = beat.data[beat.data.length-1];
            nextBeat.y = 0;
          }
        }
      };
    };

    AudioVisualiser.prototype.clear = function() {
      for (var i = 0; i < this.beats.length; i++) {
        var beat = this.beats[i];
        if (beat && beat.canvas) {
          beat.ctx.clearRect(0, 0, beat.canvas.offsetWidth, beat.canvas.offsetHeight);
          beat.lastFrame = 0;
        }
      };
    };

    AudioVisualiser.prototype.activate = function(input) {
      this.enabled = true;
      this.drawing = false;
      this.analyzeBeatIndex = -1;
      // console.log('activate visualizer');
      this.input = input;
      this.input.connect(this.audioProcessor);
      this.audioProcessor.connect(context.destination);
      // this.clear();
    };

    AudioVisualiser.prototype.reinitialize = function(input) {
      for (var i = 0; i < this.beats.length; i++) {
        var beat = this.beats[i];
        if (beat && beat.canvas && !document.contains(beat.canvas)) {
          delete beat.ctx;
          delete beat.canvas;
        }
      }
      this.beats = [];
    };

    AudioVisualiser.prototype.deactivate = function() {
      this.enabled = false;
      try {
        if (this.input) {
          this.input.disconnect(this.audioProcessor);
        }
        this.audioProcessor.disconnect(context.destination);
      } catch (ex) {
        // console.log(ex);
      }
      // this.beat = null;
    };

    AudioVisualiser.prototype.beatSync = function(evt) {
      // console.log('BEAT Sync: '+evt.flatIndex);
      if (!evt.playbackActive) {
        return;
      }

      if (this.analyzeBeatIndex !== -1) {
        var curDrawingBeat = this.beats[this.analyzeBeatIndex];
        if (curDrawingBeat) {
          curDrawingBeat.nextBeatIndex = evt.flatIndex;
        }
      }
      var beat = this.beats[evt.flatIndex];

      beat = this.initializeBeat(evt);
      beat.isFirst = evt.playbackStart;

      beat.startTime = evt.playbackActive? evt.startTime : -1;
      beat.endTime = evt.endTime;
      beat.lastFrame = 0;
      beat.frame = 0;

      if (!this.drawing) {
        this.drawing = true;
        this.drawBeatIndex = evt.flatIndex;
        this.analyzeBeatIndex = evt.flatIndex;

        var delay = 1000*(evt.startTime-context.currentTime);
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
        // clear all canvases when starting drawing the first playback beat
        if (beat.isFirst && beat.x === 0) {
          this.clear();
          beat.isFirst = false;
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
            beat.y = beat.height * (1.0 - beat.data[dataIndex] / 256.0);
            beat.x++;
            ctx.lineTo(beat.x, beat.y);
          }
          ctx.stroke();
          beat.frame = beat.lastFrame;
        }
        if (beat.x >= beatWidth) {
          this.drawBeatIndex = beat.nextBeatIndex;
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
        var v = 1.0 - beat.data[recordIndex] / 256.0;
        beat.y = v * beat.height;
        ctx.lineTo(i, beat.y);
      }
      beat.x = graphEnd;
      ctx.stroke();
    };

    /*
    AudioVisualiser.prototype.drawVector = function(beat) {
      if (beat.lastFrame === 0) {
        return '';
      }

      var points = [];
      var lastValue = -1;
      function valueAt(offset) {
        var value = points[points.length-1+offset];
        if (value) {
          return value.split(',')[1];
        }
      }
      function addPoint(x, y) {
        if (y === lastValue && valueAt(-2) === y.toString()) {
          points.pop();
        }
        points.push(x+','+y);
        lastValue = y;
      }

      var prevBeat = this.beats[beat.index-1];
      if (prevBeat && prevBeat.complete === 1) {
        addPoint(0, prevBeat.y);
      } else {
        addPoint(0, beat.height/2);
      }

      var records = beat.lastFrame;
      var graphEnd = parseInt(beat.width * beat.complete);
      for (var i = 1; i <= graphEnd; i++) {
        var recordIndex = parseInt(i*(records/graphEnd));
        var v = 1.0 - beat.data[recordIndex] / 256.0;
        beat.y = v * beat.height;
        addPoint(i, beat.y);
      }

      var polyline = points.join(' ');
      return '<polyline fill="none" stroke="rgb(180, 0, 0)" points="'+polyline+'"/>'
    }

    AudioVisualiser.prototype.drawSvg = function(beat) {

      for (var i = 0; i < this.beats.length; i++) {
        var beat = this.beats[i];
        if (beat && beat.canvas) {
          var graph = this.drawVector(beat);
          beat.svgCanvas = angular.element(
            '<svg viewBox="0 0 {0} {1}" width="{0}" height="{1}">{2}</svg>'
              .format(beat.width, beat.height, graph)
          )[0];
          beat.canvas.parentElement.appendChild(beat.svgCanvas);
        }
      }
    }
    */
    AudioVisualiser.prototype.updateSize = function() {
      for (var i = 0; i < this.beats.length; i++) {
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