(function() {
  'use strict';

  angular
    .module('bd.app')
    .value('HighlightTimeline', HighlightTimeline);

  function HighlightTimeline(slides) {
    this.slides = slides;
  }

  HighlightTimeline.prototype.start = function() {
    this.currentSubbeatElem = null;
    this.activeTimers = {};
  };

  HighlightTimeline.prototype.stop = function() {
    if (this.currentSubbeatElem) {
      this.currentSubbeatElem.removeClass('active');
    }
    Object.keys(this.activeTimers).forEach(function(key) {
      clearTimeout(this.activeTimers[key]);
    }.bind(this));
  };

  HighlightTimeline.prototype.beatSync = function(evt) {
    if (evt.playbackActive) {
      var subbeatIdTemplate = "bar_{0}_{1}_".format(evt.bar, evt.beat);
      var barBeat = this.slides.bars[evt.flatIndex];
      var beatDelay = evt.startTime - evt.eventTime;
      barBeat.visibleSubbeats.forEach(function(index) {
        var id = subbeatIdTemplate+index;
        var subbeatDelay = evt.duration*(index-1)/barBeat.subbeats.length;

        var timerKey = window.performance.now().toFixed(2);
        var timerId = setTimeout(function(key) {
          delete this.activeTimers[key];
          if (this.currentSubbeatElem) {
            this.currentSubbeatElem.removeClass('active');
          }
          this.currentSubbeatElem = angular.element(document.getElementById(id));
          this.currentSubbeatElem.addClass('active');
        }.bind(this), 1000*(beatDelay+subbeatDelay), timerKey);
        this.activeTimers[timerKey] = timerId;
      }.bind(this));
    }
  };

})();