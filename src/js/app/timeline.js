(function() {
  'use strict';

  angular
    .module('bd.app')
    .value('Timeline', Timeline);

  function Timeline(audioContext, barSwiper, drumsSwiper) {
    this.audioContext = audioContext;
    this.barSwiper = barSwiper;
    this.drumsSwiper = drumsSwiper;
    this.timelineElem = document.getElementById('time-marker');
    this.timelineElem.style.visibility = "hidden";
    this.boundRedraw = this.redraw.bind(this);
    this.running = false;
  }

  Timeline.prototype.start = function() {
    var barTop = this.barSwiper.wrapper.offset().top;
    var instrumentTop = this.drumsSwiper.wrapper.offset().top;
    var height = instrumentTop-barTop+this.drumsSwiper.wrapper.height();

    this.timelineElem.style.top = parseInt(barTop)+'px';
    this.timelineElem.style.height = parseInt(height)+'px';
    this.timelineElem.style.visibility = "visible";
    this.beatBarElement = null;
    this.running = true;
  };

  Timeline.prototype.stop = function() {
    this.running = false;
    this.timelineElem.style.left = 0;
    this.timelineElem.style.visibility = "hidden";
  };

  Timeline.prototype.beatSync = function(section, bar, beat, bpm) {
    this.beatTime = 60 / bpm;
    var slide = (bar-1)*section.timeSignature.top+beat-1;
    var beatBarElement = this.barSwiper.$('.swiper-slide')[slide];
    this.beatStartTime = this.audioContext.currentTime;
    if (!this.beatBarElement) {
      this.beatBarElement = beatBarElement;
      this.redraw();
    } else {
      this.beatBarElement = beatBarElement;
    }
  };

  Timeline.prototype.redraw = function() {
    if (this.running) {
      var elapsed = this.audioContext.currentTime - this.beatStartTime;
      var fraction = elapsed / this.beatTime;

      var barBox = this.beatBarElement.getBoundingClientRect();
      this.timelineElem.style.left = barBox.left+fraction*barBox.width+'px';
      requestAnimationFrame(this.boundRedraw);
    }
  };

})();