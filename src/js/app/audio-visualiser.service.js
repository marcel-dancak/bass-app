(function() {
  'use strict';

  angular
    .module('bd.app')
    .factory('audioVisualiser', audioVisualiser);

  function audioVisualiser() {
    function AudioVisualiser() {}

    var lastRender = 0;

    AudioVisualiser.prototype.initializeBeat = function(barIndex, beat) {
      var canvasId = 'canvas_'+barIndex+'_'+beat;

      var canvas = this.beatDrawElements[canvasId];
      if (!canvas) {
        canvas = document.getElementById(canvasId);
        if (canvas) {
          this.beatDrawElements[canvasId] = canvas;
        }
      }
      this.style = 0;
      this.width = canvas.offsetWidth;
      this.height = canvas.offsetHeight;
      canvas.setAttribute('width', this.width);
      canvas.setAttribute('height', this.height);
      this.x = 0;
      this.y = this.height/2;
      this.ctx = canvas.getContext("2d");
      this.ctx.fillStyle = 'rgb(240, 240, 240)';
      this.ctx.lineWidth = 1;
      this.ctx.strokeStyle = 'rgb(180, 0, 0)';
      // this.ctx.translate(0, 0);
    }
    AudioVisualiser.prototype.initialize = function(analyser) {
        this.dataArray = new Uint8Array(analyser.frequencyBinCount);
        this.analyser = analyser;

        this.enabled = true;
        this.beatDrawElements = {};
        // this._analyze = this._analyze.bind(this);
    };


    AudioVisualiser.prototype.reset = function() {
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.x = 0;
      this.ctx.moveTo(0, this.y);        
    };

    function analyze(arg) {
      // var time = this.visualiser.analyser.context.currentTime;
      if (this.visualiser.enabled && this.beat) {
        this.visualiser.draw();
        requestAnimationFrame(
          analyze.bind({
            visualiser: this.visualiser,
            beat: this.beat
          })
        );
      }
    }

    AudioVisualiser.prototype.beatSync = function(barIndex, beatIndex, bpm) {
      // console.log('BEAT Sync '+bpm);

      if (barIndex === 1 && beatIndex === 1) {
        setTimeout(function() {
          var name;
          for (name in this.beatDrawElements) {
            // skip first beat in bar, it will be cleared automaticaly
            if (name !== 'canvas_1_1') {
              var canvas = this.beatDrawElements[name];
              var ctx = canvas.getContext('2d');
              ctx.clearRect(0, 0, this.width, this.height);
            }
          }
        }.bind(this), 60);
      }

      var beatTime = 60/bpm;
      var beatStart = this.analyser.context.currentTime;
      var beat = {
        bar: barIndex,
        index: beatIndex,
        bpm: bpm,
        startTime: beatStart,
        endTime: beatStart + beatTime
      }

      if (!this.beat) {
        this.beat = beat;
        this.nextBeat = null;
        this.initializeBeat(barIndex, beatIndex);
        this.reset();
        lastRender = beatStart;
        console.log('STARTING BEAT');
        requestAnimationFrame(
          analyze.bind({
            visualiser: this,
            beat: beat
          })
        );
      } else {
        this.nextBeat = beat;
      }
    };

    AudioVisualiser.prototype.draw = function() {
      var ctx = this.ctx;

      var time = this.analyser.context.currentTime-0.044;
      var diff = 1000*(time-lastRender);
      // console.log(diff);
      if (diff <= 0) {
        return;
      }
      lastRender = time;

      // this.style++;
      // if (this.style % 2) {
      //   ctx.strokeStyle = 'rgb(180, 0, 0)';
      // } else {
      //   ctx.strokeStyle = 'rgb(0, 0, 180)';
      // }
      // if (diff > 30) {
      //   ctx.strokeStyle = 'rgb(0, 0, 0)';
      // }
      ctx.strokeStyle = 'rgb(180, 0, 0)';
      this.analyser.getByteTimeDomainData(this.dataArray);
      // console.log(diff);
      
      // ctx.beginPath();
      // ctx.moveTo(x-2, y);
      // ctx.lineTo(x, y);
      // ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(this.x, this.y);

      var relativeOffset = (time - this.beat.startTime) / (this.beat.endTime-this.beat.startTime);

      var beatWidth = this.width;
      var toPx = Math.round(relativeOffset*beatWidth);
      // console.log(relativeOffset);

      var steps = toPx - this.x;
      var offset = parseInt(2048*(46.44-diff)/46.44);
      // console.log(offset);
      for(var i = 0; i < steps; i+=1) {
        // for 4096
        var dataIndex = offset+parseInt((i+1)*(2048-offset)/steps);

        // for fftSize 2048
        // var dataIndex= parseInt((i+1)*this.analyser.frequencyBinCount/steps);
        // if (diff < 20) {
        //   dataIndex= 512+parseInt((i+1)*(512)/steps);
        // }
        var v = this.dataArray[dataIndex-1] / 128.0;
        this.y = v * this.height / 2;
        if (i !== 0) {
          ctx.lineTo(this.x+1, this.y);
        }
        this.x += 1;
        if (this.x >= this.width) {
          // console.log('** beat overflow');
          if (this.nextBeat) {
            ctx.stroke();
            this.x = 0;
            this.beat = this.nextBeat;
            this.nextBeat = null;
            this.initializeBeat(this.beat.bar, this.beat.index);
            ctx = this.ctx;
            // ctx.strokeStyle = 'rgb(0, 180, 0)';
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
          } else {
            this.beat = null;
            console.log('waiting on sync');
            break;
          }
        }
      }
      ctx.stroke();
    };

    return new AudioVisualiser();
  };
})();