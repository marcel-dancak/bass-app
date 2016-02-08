(function() {
  'use strict';

  angular
    .module('bd.app')
    .factory('audioVisualiser', audioVisualiser);

  function audioVisualiser() {
    function AudioVisualiser() {}

    AudioVisualiser.prototype.initialize = function(elem, analyser) {
        this.x = 0;
        this.y = 0;
        this.width = canvas.offsetWidth;
        this.height = canvas.offsetHeight;
        canvas.setAttribute('width', this.width);
        canvas.setAttribute('height', this.height);
        this.ctx = canvas.getContext("2d");
        this.ctx.fillStyle = 'rgb(240, 240, 240)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = 'rgb(180, 0, 0)';

        this.dataArray = new Uint8Array(analyser.frequencyBinCount);
        this.analyser = analyser;
    };


    AudioVisualiser.prototype.reset = function() {
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.x = 0;
      this.ctx.moveTo(0, this.y);        
    };

    AudioVisualiser.prototype.draw = function() {
      //console.log('drawing');
      var ctx = this.ctx;
      this.analyser.getByteTimeDomainData(this.dataArray);
      
      // ctx.beginPath();
      // ctx.moveTo(x-2, y);
      // ctx.lineTo(x, y);
      // ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      for(var i = 0; i < this.analyser.frequencyBinCount; i+=60) {
        var v = this.dataArray[i] / 128.0;
        this.y = v * this.height / 2;
        if (this.x > this.width) {
          this.reset();
        }
        if (i === 0) {
        } else {
          ctx.lineTo(this.x, this.y);
        }
        this.x += 0.75;
      }
      ctx.stroke();
    };

    return new AudioVisualiser();
  };
})();