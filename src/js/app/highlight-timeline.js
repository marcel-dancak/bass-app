(function() {
  'use strict';

  angular
    .module('bd.app')
    .value('HighlightTimeline', HighlightTimeline);

  function HighlightTimeline(slides) {
    this.slides = slides;
    // this.$ = new Swiper().$;
  }

  HighlightTimeline.prototype._removeActiveClass = function() {
    if (this.swiperElem) {
      var activeElems = this.swiperElem.querySelectorAll('.swiper-slide .subbeat.active');
      for (var i = 0; i < activeElems.length; i++) {
        angular.element(activeElems[i]).removeClass('active');
      }
    }
  };

  HighlightTimeline.prototype.start = function() {
    // this.currentSubbeatElem = null;
    this.activeTimers = {};
    this.swiperElem = document.querySelector('.bar-swiper');
  };

  HighlightTimeline.prototype.stop = function() {
    // if (this.currentSubbeatElem) {
    //   this.currentSubbeatElem.removeClass('active');
    // }
    this._removeActiveClass();
    Object.keys(this.activeTimers).forEach(function(key) {
      clearTimeout(this.activeTimers[key]);
    }.bind(this));
    this.swiperElem = null;
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
          // if (this.currentSubbeatElem) {
          //   this.currentSubbeatElem.removeClass('active');
          // }
          // this.currentSubbeatElem = angular.element(document.getElementById(id));
          // this.currentSubbeatElem.addClass('active');


          this._removeActiveClass();
          var nextActiveElems = this.swiperElem.querySelectorAll('.swiper-slide #'+id);
          for (var i = 0; i < nextActiveElems.length; i++) {
            angular.element(nextActiveElems[i]).addClass('active');
          }

        }.bind(this), 1000*(beatDelay+subbeatDelay), timerKey);
        this.activeTimers[timerKey] = timerId;
      }.bind(this));
    }
  };

})();