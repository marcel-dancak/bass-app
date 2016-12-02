(function() {
  'use strict';

  angular
    .module('bd.app')
    .factory('swiperControl', swiperControl);

  function swiperControl($timeout, workspace) {


    function destroySwiper(swiper) {
      swiper.detachEvents();
      swiper.onTransitionEnd = angular.noop;
      swiper.destroy();
    }


    function SwiperControl() {
      this.barSwiper = null;
      this.instrumentSwiper = null;
      this.swiperConfig = {
        visibleSubbeats: 4
      };
      this.updateVisibleSlides = function() {
        $timeout(this.updateSlidesVisibility.bind(this));
      }.bind(this);
    }

    SwiperControl.prototype.updateSlidesVisibility = function() {
      console.log('updateSlidesVisibility');
      var playbackRange = this.lastSlide - this.firstSlide + 1;

      var visibleIndexes = [];
      var length = this.barSwiper.activeIndex + this.barSwiper.params.slidesPerView + this.barSwiper.params.slidesPerGroup;
      var firstVisible = this.barSwiper.activeIndex - this.barSwiper.params.slidesPerGroup;
      // console.log(firstVisible);
      for (var i = firstVisible; i < length; i++) {
        var index = i >= playbackRange? i - playbackRange : i;
        index += this.firstSlide;
        if (index >= 0) {
          visibleIndexes.push(index);
        }
      }
      // console.log('visible: '+visibleIndexes);
      for (var i = 0; i < this.slides.length; i++) {
        var slide = this.slides[i];
        var visible = visibleIndexes.indexOf(i) !== -1;
        if (visible && !slide.loading && slide.obsolete) {
          slide.type = this.slideType;
          slide.obsolete = false;
          slide.beat = workspace.trackSection.beat(slide.beat.bar, slide.beat.beat);
        }
        slide.visible = visible;
        slide.initialized = visible || slide.initialized;
      }
    };

    SwiperControl.prototype.updateSubbeatsVisibility = function() {
      var slideWidth = this.barSwiper.width / this.barSwiper.params.slidesPerView;
      var visibleSubbeats;
      if (slideWidth >= 200) {
        this.swiperConfig.visibleSubbeats = 4;
      } else if (slideWidth >= 100) {
        this.swiperConfig.visibleSubbeats = 2;
      } else {
        this.swiperConfig.visibleSubbeats = 2;
      }
    };

    SwiperControl.prototype.setSlides = function(slides, params) {
      this.slides = slides;
      this.firstSlide = 0;
      this.lastSlide = slides.length - 1;
      // params.initialSlide = 0;
      this.reinitialize(params);
      this.barSwiper.slideTo(0, 0, true);
      this.barSwiper.setWrapperTranslate(0);
      this.updateSlidesVisibility();
      this.updateSubbeatsVisibility();
    };

    SwiperControl.prototype._updateLastSlideClass = function() {
      var Dom7 = this.barSwiper.$;
      Dom7(this.barSwiper.wrapper[0].querySelector('.bar-end')).removeClass('bar-end');
      Dom7(this.instrumentSwiper.wrapper[0].querySelector('.bar-end')).removeClass('bar-end');
      Dom7(this.barSwiper.slides[this.lastSlide]).addClass('bar-end');
      Dom7(this.instrumentSwiper.slides[this.lastSlide]).addClass('bar-end');
    };

    SwiperControl.prototype.reinitialize = function(params) {
      params.roundLengths = true;
      if (this.barSwiper) {
        // TODO: calculate actual beat index instead
        if (!angular.isDefined(params.initialSlide)) {
          params.initialSlide = this.barSwiper.activeIndex;
        }
        this.barSwiper.off('transitionEnd', this.updateVisibleSlides);
        destroySwiper(this.barSwiper);
        destroySwiper(this.instrumentSwiper);
      }
      var barParams = angular.copy(params);
      angular.extend(barParams, {
        paginationClickable: true,
        pagination: '.swiper-pagination',
        nextButton: '.swiper-button-next',
        prevButton: '.swiper-button-prev'
      });

      this.barSwiper = new Swiper('.bar.swiper-container', barParams);
      this.instrumentSwiper = new Swiper('.instrument.swiper-container', params);
      this.barSwiper.params.control = this.instrumentSwiper;
      this.barSwiper.on('transitionEnd', this.updateVisibleSlides);
      this._updateLastSlideClass();

      var inputs = this.barSwiper.$('.swiper-slide input');
      inputs.on('mousedown mouseup mousemove', function(e) {
        e.stopPropagation();
      });
      this.loopMode = false;
    };

    SwiperControl.prototype.setBeatsPerView = function(slidesPerView) {
      var lockSwiper = false;
      slidesPerView = Math.max(slidesPerView, 4); // Restricts min value
      slidesPerView = Math.min(slidesPerView, 12); // Restricts max value
      var slidesCount = this.maxSlides || this.barSwiper.slides.length;
      console.log('updateSlidesSize: '+slidesPerView+' / max: '+slidesCount);
      if (slidesPerView >= slidesCount) {
        slidesPerView = slidesCount;
        lockSwiper = true;
      }
      slidesPerView = Math.min(slidesPerView, slidesCount);

      this.barSwiper.params.slidesPerView = slidesPerView;
      this.instrumentSwiper.params.slidesPerView = slidesPerView;
      this.barSwiper.updateSlidesSize();
      this.barSwiper.updatePagination();
      this.instrumentSwiper.updateSlidesSize();

      // fix swipers over-sliding position
      if (this.barSwiper.activeIndex + slidesPerView >= slidesCount) {
        this.barSwiper.slideReset();
        this.instrumentSwiper.slideReset();
      }
      if (lockSwiper) {
        this.barSwiper.lockSwipes();
      } else if (!this.barSwiper.params.allowSwipeToNext) {
        this.barSwiper.unlockSwipes();
      }
      this.updateSlidesVisibility();
      this.updateSubbeatsVisibility();
      return slidesPerView;
    };

    SwiperControl.prototype.setBeatsPerSlide = function(beatsPerSlide) {
      this.barSwiper.params.slidesPerGroup = beatsPerSlide;
      this.instrumentSwiper.params.slidesPerGroup = beatsPerSlide;
      this.barSwiper.updateSlidesSize();
    };

    SwiperControl.prototype.setVisibleRange = function(first, last) {
      console.log(first+' to '+last);
      this.firstSlide = first;
      this.lastSlide = last;
      for (var i = 0; i < this.barSwiper.slides.length; i++) {
        var display = (i < first || i > last)? 'none' : '';
        this.barSwiper.wrapper[0].children[i].style.display = display;
        this.instrumentSwiper.wrapper[0].children[i].style.display = display;
      }
      this.maxSlides = last - first + 1;
      if (this.maxSlides <= this.barSwiper.params.slidesPerView) {
        // fit slides to view and lock swiper
        this.setBeatsPerView(this.maxSlides);
      } else {
        if (!this.barSwiper.params.allowSwipeToNext) {
          this.barSwiper.unlockSwipes();
        }
        this.barSwiper.update();
        this.instrumentSwiper.update();
        this.updateSlidesVisibility();
        // fix swipers over-sliding position
        if (this.barSwiper.activeIndex + this.barSwiper.params.slidesPerView >= this.maxSlides) {
          this.barSwiper.slideReset();
          this.instrumentSwiper.slideReset();
        }
      }
      this._updateLastSlideClass();
    };


    SwiperControl.prototype.switchInstrument = function(type) {
      this.slideType = type;
      var start = this.firstSlide + this.barSwiper.activeIndex;
      for (var i = 0; i <= workspace.section.beatsPerView; i++) {
        var slideIndex = start+i;
        if (slideIndex >= this.slides.length) {
          slideIndex -= this.slides.length;
        }
        var slide = this.slides[slideIndex];
        var newBeat = workspace.trackSection.beat(slide.beat.bar, slide.beat.beat);
        slide.loading = true;
        slide.obsolete = false;

        $timeout(function(slide, newBeat) {
          slide.loading = false;
          slide.beat = newBeat;
          slide.type = type;
        }.bind(this, slide, newBeat), i*40);
      }
      var loading = [];
      var obsolete = [];
      for (var i = 0; i < this.slides.length; i++) {
        var slide = this.slides[i];
        if (slide.loading) {
          loading.push(i);
        }
        if (!slide.loading && slide.type !== type) {
          slide.obsolete = true;
          obsolete.push(i);
        } else {
          slide.obsolete = false;
        }
      }
      // console.log('loading');
      // console.log(loading);
      // console.log('obsolete');
      // console.log(obsolete);
    };

    function loopCallback(s) {
      var loopConfig = s.loopConfig;
      var firstSlide = loopConfig.firstSlide;
      var lastSlide = loopConfig.lastSlide;
      var normalSlidesCount = loopConfig.normalSlidesCount;
      var playbackSlidesCount = loopConfig.playbackSlidesCount;
      var onTheirPlace = loopConfig.onTheirPlace;

      var instrumentSwiper = loopConfig.ctrl.instrumentSwiper;

      var slideIndex = s.snapIndex * workspace.section.beatsPerSlide;
      // console.log('Range: {0} - {1} Active index: {2} Loop start: {3}'.format(firstSlide, firstSlide, s.activeIndex, normalSlidesCount));
      if (slideIndex >= playbackSlidesCount) {
        console.log('LAST SLIDE, fast switch {0} -> {1}: '.format(slideIndex, slideIndex-playbackSlidesCount));
        slideIndex = slideIndex-playbackSlidesCount;
        s.slideTo(slideIndex, 0, false, true);
        loopConfig.ctrl.lastRequestedIndex = slideIndex;
      }

      var lastViewIndex = slideIndex + workspace.section.beatsPerView + workspace.section.beatsPerSlide;

      var length = Math.min(workspace.section.beatsPerView+workspace.section.beatsPerSlide, playbackSlidesCount);
      length = workspace.section.beatsPerView+workspace.section.beatsPerSlide;
      for (var i = 0; i < length; i++) {
        var j = firstSlide + i + slideIndex;
        if (j > lastSlide) {
          // skip slides outside playback range
          j += normalSlidesCount - lastSlide - 1;
        }
        // console.log(j+': '+onTheirPlace[j]);
        if (!onTheirPlace[j]) {
          var otherPlaceIndex = (j < normalSlidesCount)?
            j + normalSlidesCount - firstSlide :
            j - (normalSlidesCount - firstSlide);

          // console.log('move required: '+j+' <--> '+otherPlaceIndex);
          var elem = s.slides[otherPlaceIndex];
          var destSlideElem = s.slides[j];
          var dummyClones = [];
          // console.log('orig display: '+elem.style.display);
          s.$(destSlideElem).removeClass('swiper-slide-duplicate');
          while (destSlideElem.lastChild) {
            destSlideElem.removeChild(destSlideElem.lastChild);
          }
          for (var ch = elem.childElementCount-1; ch >= 0; ch--) {
            dummyClones.push(elem.children[0].cloneNode(true));
            destSlideElem.appendChild(elem.children[0]);
          }
          for (var ch = 0; ch < dummyClones.length; ch++) {
            elem.appendChild(dummyClones[ch]);
          }
          destSlideElem.className = elem.className;
          s.$(elem).addClass('swiper-slide-duplicate');


          elem = instrumentSwiper.slides[otherPlaceIndex];
          destSlideElem = instrumentSwiper.slides[j];
          var dummyElem = elem.children[0].cloneNode(true);

          instrumentSwiper.$(destSlideElem).removeClass('swiper-slide-duplicate');
          if (destSlideElem.lastChild) {
            destSlideElem.removeChild(destSlideElem.lastChild);
          }
          destSlideElem.appendChild(elem.children[0]);
          destSlideElem.className = elem.className;

          elem.appendChild(dummyElem);
          instrumentSwiper.$(elem).addClass('swiper-slide-duplicate');

          onTheirPlace[j] = true;
          onTheirPlace[otherPlaceIndex] = false;
        }
      }
    };

    SwiperControl.prototype.createLoop = function() {
      console.log(this.barSwiper.params.slideDuplicateClass);
      var loopConfig = {
        firstSlide: this.firstSlide,
        lastSlide: this.lastSlide,
        normalSlidesCount: this.barSwiper.slides.length,
        playbackSlidesCount: this.lastSlide - this.firstSlide + 1,
        ctrl: this,
        onTheirPlace: []
      };

      console.log('create loop from: '+loopConfig.normalSlidesCount+' slides');
      for (var i = 0; i < loopConfig.normalSlidesCount; i++) {
        loopConfig.onTheirPlace[i] = true;
      }

      var emptySlide = angular.element('<div class="swiper-slide"></div>');
      emptySlide.addClass(this.barSwiper.params.slideDuplicateClass);
      emptySlide = emptySlide[0];
      for (var i = 0; i <= workspace.section.beatsPerView; i++) {
        this.barSwiper.appendSlide(emptySlide.cloneNode());
        this.instrumentSwiper.appendSlide(emptySlide.cloneNode());
        loopConfig.onTheirPlace.push(false);
      }

      this.reinitialize({
        slidesPerView: this.barSwiper.params.slidesPerView,
        slidesPerGroup: this.barSwiper.params.slidesPerGroup,
        initialSlide: this.barSwiper.activeIndex
      });

      this.barSwiper.on('transitionEnd', loopCallback);
      this.barSwiper.loopConfig = loopConfig;
      loopCallback(this.barSwiper);
      this.loopMode = true;
    };


    SwiperControl.prototype._destroyLoop = function() {
      if (!this.barSwiper.loopConfig) {
        return;
      }
      var loopConfig = this.barSwiper.loopConfig;
      var normalSlidesCount = loopConfig.normalSlidesCount;
      var cloneIndexes = [];
      this.barSwiper.off('transitionEnd', loopCallback);
      // this.barSwiper.detachEvents();

      function returnSlide(swiper, index, origIndex) {
        var elem = swiper.slides[index];
        var destSlideElem = swiper.slides[origIndex];
        while (destSlideElem.lastChild) {
          destSlideElem.removeChild(destSlideElem.lastChild);
        }
        for (var ch = elem.childElementCount-1; ch >= 0; ch--) {
          destSlideElem.appendChild(elem.children[0]);
        }
        destSlideElem.className = elem.className;
        elem.className = swiper.params.slideDuplicateClass;
      }

      for (var j = normalSlidesCount; j < this.barSwiper.slides.length; j++) {
        cloneIndexes.push(j);
        if (loopConfig.onTheirPlace[j]) {
          var origPlaceIndex = j % normalSlidesCount;
          // console.log('returning back '+j+' --> '+origPlaceIndex);
          returnSlide(this.barSwiper, j, origPlaceIndex);
          returnSlide(this.instrumentSwiper, j, origPlaceIndex);
        }
      }

      this.instrumentSwiper.removeSlide(cloneIndexes);
      this.barSwiper.removeSlide(cloneIndexes);
      // var obsoleteSlidesSelector = '.'+this.barSwiper.params.slideDuplicateClass;
      // var loopSlides = this.barSwiper.wrapper[0].querySelectorAll(obsoleteSlidesSelector);
      // Array.prototype.push.apply(loopSlides, instrumentSwiper.wrapper[0].querySelectorAll(obsoleteSlidesSelector));
      // loopSlides.forEach(function(elem) {
      //   elem.remove();
      // });
      this.reinitialize({
        slidesPerView: this.barSwiper.params.slidesPerView,
        slidesPerGroup: this.barSwiper.params.slidesPerGroup
      });
      // TODO: check if activeIndex is greater than without loop slides and reset to first slide
      this.updateSlidesVisibility();
      delete this.barSwiper.loopConfig;
    };

    SwiperControl.prototype.destroyLoop = function() {
      this.loopMode = false;
      if (!this.barSwiper.loopConfig) {
        return;
      }
      var loopConfig = this.barSwiper.loopConfig;
      console.log('destroying loop at: '+this.barSwiper.snapIndex);
      var endIndex = this.barSwiper.snapIndex+this.barSwiper.params.slidesPerView;
      console.log('end index: {0} (max: {1})'.format(endIndex, loopConfig.normalSlidesCount));
      if (endIndex > loopConfig.normalSlidesCount) {
        // return to begining, then destroy loop
        var index = this.lastSlide - this.firstSlide + 1;
        this.barSwiper.slideTo(index, 300);
        setTimeout(this._destroyLoop.bind(this), 400);
      } else {
        this._destroyLoop();
      }
    }

    SwiperControl.prototype.getBeatElem = function(bar, beat) {
      // var beatSelector = '.swiper-slide:not(.swiper-slide-duplicate) #beat_{0}_{1}'.format(bar, beat);
      // return this.barSwiper.wrapper[0].querySelector(beatSelector);

      var beatSelector = '.swiper-slide #beat_{0}_{1}'.format(bar, beat);
      var elems = this.barSwiper.wrapper[0].querySelectorAll(beatSelector);
      // try to find element on visible screen area
      for (var i = 0; i < elems.length; i++) {
        var elem = elems[i];
        var bounds = elem.getBoundingClientRect();
        if (bounds.left >= 0 && bounds.left < window.innerWidth) {
          return elem;
        }
      }
      // fallback to first element
      return elems[0];
    };

    SwiperControl.prototype.getBarWrapper = function() {
      return this.barSwiper.wrapper[0];
    };

    SwiperControl.prototype.reset = function() {
      this.lastRequestedIndex = 0;
      this.barSwiper.slideTo(0, 0, true);
    };

    SwiperControl.prototype.slideTo = function(slideIndex, speed, runCallbacks, internal) {
      // console.log('flatIndex: '+evt.flatIndex+' slide: '+slide);
      // console.log('active index: '+swiperControl.barSwiper.activeIndex);
      // console.log('raw slide '+slideIndex+'  last requested: '+this.lastRequestedIndex);
      if (slideIndex < this.lastRequestedIndex) {
        // compute index of 'cloned' looped slide
        slideIndex = this.lastSlide - this.firstSlide + 1 + slideIndex;
      }
      // console.log('slide to '+slideIndex);
      this.lastRequestedIndex = slideIndex;
      this.barSwiper.slideTo(slideIndex, speed, runCallbacks, internal);
    };

    return new SwiperControl();
  }
})();
