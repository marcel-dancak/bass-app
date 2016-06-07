(function() {
  'use strict';

  angular
    .module('bd.app')
    .value('HighlightTimeline', HighlightTimeline);

  function HighlightTimeline(slides) {
    this.slides = slides;
    this.running = false;
  }

  HighlightTimeline.prototype.start = function() {
    this.currentSubbeatElem = null;
    this.running = true;
  };

  HighlightTimeline.prototype.stop = function() {
    this.running = false;
    if (this.currentSubbeatElem) {
      this.currentSubbeatElem.removeClass('active');
    }
  };

  HighlightTimeline.prototype.beatSync = function(section, bar, beat, bpm) {
    var beatTime = 60 / bpm;
    var subbeatIdTemplate = "bar_{0}_{1}_".format(bar, beat);
    var flatIndex = (bar-1)*section.timeSignature.top+beat-1;
    var barBeat = this.slides.bars[flatIndex];
    barBeat.visibleSubbeats.forEach(function(index) {
      var id = subbeatIdTemplate+index;
      var delay = 1000*beatTime*(index-1)/barBeat.subbeats.length;
      setTimeout(function() {
        if (this.currentSubbeatElem) {
          this.currentSubbeatElem.removeClass('active');
        }
        if (this.running) {
          this.currentSubbeatElem = angular.element(document.getElementById(id));
          this.currentSubbeatElem.addClass('active');
        }
      }.bind(this), delay);
    }.bind(this));
  };

})();