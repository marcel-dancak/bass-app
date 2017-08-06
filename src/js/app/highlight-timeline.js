(function() {
  'use strict';

  angular
    .module('bd.app')
    .value('HighlightTimeline', HighlightTimeline);

  function HighlightTimeline(swiperControl) {
    this.swiperControl = swiperControl;
  }

  HighlightTimeline.prototype._removeActiveClass = function() {
    var activeElems = this.swiperControl.getBarWrapper().querySelectorAll('.swiper-slide .subbeat.active');
    for (var i = 0; i < activeElems.length; i++) {
      activeElems[i].classList.remove('active');
    }
  };

  HighlightTimeline.prototype.start = function() {
    this.activeTimers = {};
  };

  HighlightTimeline.prototype.stop = function() {
    this._removeActiveClass();
    Object.keys(this.activeTimers).forEach(function(key) {
      clearTimeout(this.activeTimers[key]);
    }.bind(this));
  };

  HighlightTimeline.prototype.beatSync = function(evt) {
    if (evt.playbackActive) {
      var beatDelay = evt.startTime - evt.eventTime;

      var beatElem = this.swiperControl.getBeatElem(evt.bar, evt.beat);
      if (!beatElem) return;

      var subbeatElems = beatElem.children;
      var subbeatsCount = subbeatElems.length;
      for (var index = 0; index < subbeatsCount; index++) {
        var subbeatDelay = evt.duration*index/subbeatsCount;

        var timerKey = window.performance.now().toFixed(2);
        var timerId = setTimeout(function(subbeatElem, key) {
          delete this.activeTimers[key];

          this._removeActiveClass();
          subbeatElem.classList.add('active');

        }.bind(this), 1000*(beatDelay+subbeatDelay), subbeatElems[index], timerKey);
        this.activeTimers[timerKey] = timerId;
      }
    }
  };

})();