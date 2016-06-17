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

  HighlightTimeline.prototype.beatSync = function(evt) {
    if (evt.playbackActive) {
      var subbeatIdTemplate = "bar_{0}_{1}_".format(evt.bar, evt.beat);
      var barBeat = this.slides.bars[evt.flatIndex];
      var beatDelay = evt.startTime - evt.eventTime;
      barBeat.visibleSubbeats.forEach(function(index) {
        var id = subbeatIdTemplate+index;
        var subbeatDelay = evt.duration*(index-1)/barBeat.subbeats.length;
        setTimeout(function() {
          if (this.currentSubbeatElem) {
            this.currentSubbeatElem.removeClass('active');
          }
          if (this.running) {
            this.currentSubbeatElem = angular.element(document.getElementById(id));
            this.currentSubbeatElem.addClass('active');
          }
        }.bind(this), 1000*(beatDelay+subbeatDelay));
      }.bind(this));
    } else {
      setTimeout(function() {
        if (this.currentSubbeatElem) {
          this.currentSubbeatElem.removeClass('active');
        }
        this.running = false;
      }.bind(this), 1000*(evt.startTime-evt.eventTime));
    }
  };

})();