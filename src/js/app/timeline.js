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
    this.beat = null;
    this.nextBeat = null;
    this.running = true;
  };

  Timeline.prototype.stop = function() {
    this.running = false;
    this.timelineElem.style.left = 0;
    this.timelineElem.style.visibility = "hidden";
  };

  Timeline.prototype.beatSync = function(evt) {
    var beatElement = this.barSwiper.$('.swiper-slide')[evt.flatIndex];
    if (!this.beat) {
      this.beat = angular.copy(evt);
      this.beat.element = beatElement;
      this.redraw();
    } else {
      this.nextBeat = angular.copy(evt);
      this.nextBeat.element = beatElement;
    }
  };

  Timeline.prototype.redraw = function() {
    if (this.running) {
      var currentTime = this.audioContext.currentTime;
      if (currentTime > this.beat.endTime) {
        this.beat = this.nextBeat;
      }
      var elapsed = currentTime - this.beat.startTime;
      var fraction = elapsed / this.beat.duration;

      var barBox = this.beat.element.getBoundingClientRect();
      this.timelineElem.style.left = barBox.left+fraction*barBox.width+'px';
      requestAnimationFrame(this.boundRedraw);
    }
  };

})();