(function() {
  'use strict';

  angular
    .module('bd.app')
    .factory('swiperControl', swiperControl);

  function swiperControl($timeout, workspace, $mdUtil) {


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
        // $timeout(this.updateSlidesVisibility.bind(this));
        $mdUtil.nextTick(this.updateSlidesVisibility.bind(this));
      }.bind(this);
    }

    SwiperControl.prototype.updateSlidesVisibility = function(translate) {
      var s = this.barSwiper;
      var slideVisibleClass = s.params.slideVisibleClass;

      if (translate === undefined) {
        translate = s.translate || 0;
      }
      if (s.slides.length === 0) return;
      // if (s.slides[s.slides.length-1].swiperSlideOffset === undefined) s.updateSlidesOffset();

      var offsetCenter = -translate;

      // Visible Slides
      // s.slides.removeClass(slideVisibleClass);
      // this.instrumentSwiper.slides.removeClass(slideVisibleClass);
      // var visible = [];
      for (var i = 0; i < s.slides.length; i++) {
        var slide = s.slides[i];
        var slideProgress = (offsetCenter + (s.params.centeredSlides ? s.minTranslate() : 0) - slide.swiperSlideOffset) / (slide.swiperSlideSize + s.params.spaceBetween);
        var slideBefore = -(offsetCenter - slide.swiperSlideOffset);
        var slideAfter = slideBefore + s.slidesSizesGrid[i];

        // var id = slide.getAttribute('id');
        var slideModel = this.slides[i];
        if (slideModel) {
          var beat = this.slides[i].beat;
          var sounds = workspace.trackSection.beatSounds(beat);
          if (sounds.length) {
            var max = Math.max.apply(null, sounds.map(function(s) {
              return s.end;
            }));
            if (max > 1) {
              slideAfter = slideBefore + s.slidesSizesGrid[i] * max;
            }
          }
        }
        var isVisible =
          (slideBefore >= 0 && slideBefore < s.size) ||
          (slideAfter > 0 && slideAfter <= s.size) ||
          (slideBefore <= 0 && slideAfter >= s.size);
        if (isVisible) {
          // visible.push(i);
          // s.slides.eq(i).addClass(slideVisibleClass);
          // this.instrumentSwiper.slides.eq(i).addClass(slideVisibleClass);
        }
        if (slideModel) {
          if (isVisible && this.slideType && slideModel.type !== this.slideType) {
            slideModel.type = this.slideType;
            slideModel.beat = workspace.trackSection.beat(slideModel.beat.bar, slideModel.beat.beat);
          }
          slideModel.initialized = isVisible || slideModel.initialized;
        }

        var hasVisibleClass = slide.classList.contains(slideVisibleClass);
        if (hasVisibleClass && !isVisible) {
          slide.classList.remove(slideVisibleClass);
          this.instrumentSwiper.slides[i].classList.remove(slideVisibleClass);
        }
        if (!hasVisibleClass && isVisible) {
          slide.classList.add(slideVisibleClass);
          this.instrumentSwiper.slides[i].classList.add(slideVisibleClass);
        }
      }
      // console.log(visible);
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
      var resetPosition = this.slides && slides.length < this.slides.length;
      this.slideType = slides[0].type;
      this.slides = slides;
      this.firstSlide = 0;
      this.lastSlide = slides.length - 1;
      // params.initialSlide = 0;
      this.reinitialize(params);
      this.barSwiper.slideTo(params.initialSlide || 0, 0, false);
      if (resetPosition) {
        // this.barSwiper.slideTo(0, 0, false);
        this.barSwiper.setWrapperTranslate(0);
      }
      this.updateSlidesVisibility();
      this.updateSubbeatsVisibility();
      if (slides.length <= this.barSwiper.params.slidesPerView) {
        this.barSwiper.lockSwipes();
      }
    };

    SwiperControl.prototype._updateLastSlideClass = function() {
      var el = this.barSwiper.wrapper[0].querySelector('.bar-end');
      if (el) {
        el.classList.remove('bar-end');
        this.instrumentSwiper.wrapper[0].querySelector('.bar-end').classList.remove('bar-end');
      }
      this.barSwiper.slides[this.lastSlide].classList.add('bar-end');
      this.instrumentSwiper.slides[this.lastSlide].classList.add('bar-end');
    };

    SwiperControl.prototype.reinitialize = function(params) {
      params.roundLengths = true;
      if (this.barSwiper) {
        // TODO: calculate actual beat index instead
        if (!angular.isDefined(params.initialSlide)) {
          params.initialSlide = this.barSwiper.snapIndex;
        }
        this.barSwiper.off('transitionEnd', this.updateVisibleSlides);
        destroySwiper(this.barSwiper);
        destroySwiper(this.instrumentSwiper);
      }
      var barParams = angular.copy(params);

      this.barSwiper = new Swiper('.editor .bar.swiper-container', barParams);
      this.instrumentSwiper = new Swiper('.editor .instrument.swiper-container', params);

      this.barSwiper.params.control = this.instrumentSwiper;
      this.barSwiper.on('transitionEnd', this.updateVisibleSlides);
      this.barSwiper.on('touchEnd', this.onTouchEnd);
      this.barSwiper.on('touchMove', $mdUtil.throttle(this.updateVisibleSlides, 200));
      this.barSwiper.updateSlidesOffset();
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
      this.instrumentSwiper.updateSlidesSize();

      // fix swipers over-sliding position
      if (this.barSwiper.snapIndex + slidesPerView >= slidesCount) {
        this.barSwiper.slideReset();
        this.instrumentSwiper.slideReset();
      }
      if (lockSwiper) {
        this.barSwiper.lockSwipes();
      } else if (!this.barSwiper.params.allowSwipeToNext) {
        this.barSwiper.unlockSwipes();
      }
      this.barSwiper.updateSlidesOffset();
      this.updateSlidesVisibility();
      this.updateSubbeatsVisibility();
      return slidesPerView;
    };

    // SwiperControl.prototype.setBeatsPerSlide = function(beatsPerSlide) {
    //   this.barSwiper.params.slidesPerGroup = beatsPerSlide;
    //   this.instrumentSwiper.params.slidesPerGroup = beatsPerSlide;
    //   this.barSwiper.updateSlidesSize();
    // };

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
        this.barSwiper.updateSlidesOffset();
        this.instrumentSwiper.update();
        this.updateSlidesVisibility();
        // fix swipers over-sliding position
        if (this.barSwiper.snapIndex + this.barSwiper.params.slidesPerView >= this.maxSlides) {
          this.barSwiper.slideReset();
          this.instrumentSwiper.slideReset();
        }
      }
      this._updateLastSlideClass();
    };


    SwiperControl.prototype.switchInstrument = function(type) {
      this.slideType = type;
      var start = this.firstSlide + this.barSwiper.snapIndex;
      var slidesPerView = this.barSwiper.params.slidesPerView;
      for (var i = 0; i <= slidesPerView; i++) {
        var slideIndex = start+i;
        if (slideIndex >= this.slides.length) {
          slideIndex -= this.slides.length;
        }
        var slide = this.slides[slideIndex];
        var newBeat = workspace.trackSection.beat(slide.beat.bar, slide.beat.beat);

        slide.beat = newBeat;
        slide.type = type;
      }
    };

    SwiperControl.prototype.rebuildSlides = function() {
      for (var i = 0; i < this.slides.length; i++) {
        var slide = this.slides[i];
        slide.initialized = false;
      }
      this.updateVisibleSlides();
    };

    function loopCallback(s) {
      var loopConfig = s.loopConfig;
      var firstSlide = loopConfig.firstSlide;
      var lastSlide = loopConfig.lastSlide;
      var normalSlidesCount = loopConfig.normalSlidesCount;
      var playbackSlidesCount = loopConfig.playbackSlidesCount;
      var onTheirPlace = loopConfig.onTheirPlace;

      var instrumentSwiper = loopConfig.ctrl.instrumentSwiper;

      var slideIndex = s.snapIndex;
      // console.log('Range: {0} - {1} Active index: {2} Loop start: {3}'.format(firstSlide, firstSlide, s.activeIndex, normalSlidesCount));
      if (slideIndex >= playbackSlidesCount) {
        console.log('LAST SLIDE, fast switch {0} -> {1}: '.format(slideIndex, slideIndex-playbackSlidesCount));
        // console.log('LAST SLIDE, fast switch {0} -> {1}: '.format(slideIndex, slideIndex-normalSlidesCount));
        slideIndex = slideIndex-playbackSlidesCount;
        // slideIndex = loopConfig.ctrl.lastRequestedIndex - slideIndex;
        // slideIndex = slideIndex - normalSlidesCount;
        s.slideTo(slideIndex, 0, false, true);
        loopConfig.ctrl.lastRequestedIndex = slideIndex;
      }

      // var ahead = s.params.slidesPerGroup;
      var ahead = loopConfig.ctrl.preRenderedSlides;

      var lastViewIndex = slideIndex + s.params.slidesPerView + ahead;

      var length = Math.min(s.params.slidesPerView + ahead, playbackSlidesCount);
      length = s.params.slidesPerView + ahead;
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
      console.log('createLoop')
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
      var clonesCount = this.barSwiper.params.slidesPerView + 2;
      for (var i = 0; i <= clonesCount; i++) {
        this.barSwiper.appendSlide(emptySlide.cloneNode());
        var clone = emptySlide.cloneNode();
        clone.setAttribute('id', this.instrumentSwiper.slides[this.firstSlide+i].getAttribute('id'));
        this.instrumentSwiper.appendSlide(clone);
        loopConfig.onTheirPlace.push(false);
      }

      this.reinitialize({
        slidesPerView: this.barSwiper.params.slidesPerView,
        initialSlide: this.barSwiper.snapIndex
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

      // note: maybe not needed to reinitialize
      this.reinitialize({
        slidesPerView: this.barSwiper.params.slidesPerView
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
        // var index = this.lastSlide - this.firstSlide + 1;
        // return to the begining of the last slide
        var index = loopConfig.normalSlidesCount - this.barSwiper.params.slidesPerView;
        this.barSwiper.slideTo(index, 300);
        this.lastRequestedIndex = index;
        // this.slideTo(index, 300);

        setTimeout(this._destroyLoop.bind(this), 400);
      } else {
        this._destroyLoop();
      }
    }

    SwiperControl.prototype.getBeatElem = function(bar, beat) {
      var slideId = 'beat_{0}_{1}'.format(bar, beat);
      for (var i = this.instrumentSwiper.snapIndex; i < this.instrumentSwiper.slides.length; i++) {
        if (this.instrumentSwiper.slides[i].getAttribute('id') === slideId) {
          return this.barSwiper.slides[i].querySelector('.bar-beat');
        }
      }
      for (var i = 0; i < this.instrumentSwiper.snapIndex; i++) {
        if (this.instrumentSwiper.slides[i].getAttribute('id') === slideId) {
          return this.barSwiper.slides[i].querySelector('.bar-beat');
        }
      }
    };

    SwiperControl.prototype.getSoundElem = function(sound) {
      var beatSelector = '#beat_{0}_{1} .sounds-container'.format(sound.beat.bar, sound.beat.beat);
      var contEl = this.instrumentSwiper.wrapper[0].querySelector(beatSelector);
      var index = sound.beat.data.indexOf(sound);
      if (index !== -1) {
        return contEl.querySelectorAll('.sound-container:not(.ng-leave)')[index];
      }
    };

    SwiperControl.prototype.getBarWrapper = function() {
      return this.barSwiper.wrapper[0];
    };

    SwiperControl.prototype.setIndex = function(index) {
      this.lastRequestedIndex = index;
      this.barSwiper.slideTo(index, 0, true);
    };

    SwiperControl.prototype.slideTo = function(slideIndex, speed, runCallbacks, internal) {
      // console.log('flatIndex: '+evt.flatIndex+' slide: '+slide);
      // console.log('raw slide '+slideIndex+'  last requested: '+this.lastRequestedIndex);
      // if (slideIndex < this.lastRequestedIndex) {
      while (slideIndex < this.lastRequestedIndex) {
        // compute index of 'cloned' looped slide
        slideIndex = this.lastSlide - this.firstSlide + 1 + slideIndex;
      }
      // console.log('slide to '+slideIndex);
      this.lastRequestedIndex = slideIndex;
      // console.log('computed slide index: '+slideIndex);
      this.barSwiper.slideTo(slideIndex, speed, runCallbacks, internal);
    };

    SwiperControl.prototype.getPosition = function() {
      var maxIndex = this.lastSlide;
      // var sFlatIndex = swiperControl.barSwiper.snapIndex
      var sFlatIndex = this.firstSlide + this.barSwiper.snapIndex;
      var eFlatIndex = sFlatIndex + this.barSwiper.params.slidesPerView - 1;

      if (eFlatIndex > maxIndex) {
        // invalid range for playback lock
        eFlatIndex -= maxIndex;
      }
      return {
        start: {
          flatIndex: sFlatIndex,
          bar: parseInt(sFlatIndex / workspace.section.timeSignature.top) + 1,
          beat: (sFlatIndex % workspace.section.timeSignature.top) + 1
        },
        end: {
          flatIndex: eFlatIndex,
          bar: parseInt(eFlatIndex / workspace.section.timeSignature.top) + 1,
          beat: (eFlatIndex % workspace.section.timeSignature.top) + 1
        }
      };
    };

    SwiperControl.prototype.onTouchEnd = function() {};

    return new SwiperControl();
  }
})();
