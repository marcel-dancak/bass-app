(function() {
  'use strict';

  angular
    .module('bd.app')
    .value('HighlightTimeline', HighlightTimeline);

  function HighlightTimeline(swiperControl) {
    this.swiperControl = swiperControl;
  }

  HighlightTimeline.prototype._removeActiveClass = function() {
    var activeElems = this.swiperControl.barSwiper.wrapper[0].querySelectorAll('.swiper-slide .subbeat.active');
    for (var i = 0; i < activeElems.length; i++) {
      angular.element(activeElems[i]).removeClass('active');
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

      var beatSelector = '.swiper-slide:not(.swiper-slide-duplicate) #beat_{0}_{1}'.format(evt.bar, evt.beat);
      var beatElem = this.swiperControl.barSwiper.wrapper[0].querySelector(beatSelector);
      var subbeatElements = beatElem.querySelectorAll('.subbeat:not(.hidden)');

      subbeatElements.forEach(function(subbeatElem, index) {
        var subbeatDelay = evt.duration*index/subbeatElements.length;

        var timerKey = window.performance.now().toFixed(2);
        var timerId = setTimeout(function(key) {
          delete this.activeTimers[key];

          this._removeActiveClass();
          angular.element(subbeatElem).addClass('active');

        }.bind(this), 1000*(beatDelay+subbeatDelay), timerKey);
        this.activeTimers[timerKey] = timerId;
      }, this);
    }
  };

})();