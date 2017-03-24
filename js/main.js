(function (window, document) {
  window.Dom7 = new Swiper().$;

  /** Responsive menu **/
  var menu = document.getElementById('menu');
  var WINDOW_CHANGE_EVENT = ('onorientationchange' in window) ? 'orientationchange':'resize';

  function toggleHorizontal() {
    menu.classList.toggle('pure-menu-horizontal');
  };

  function toggleMenu() {
    // set timeout so that the panel has a chance to roll up
    // before the menu switches states
    if (menu.classList.contains('open')) {
      setTimeout(toggleHorizontal, 500);
    }
    else {
      toggleHorizontal();
    }
    menu.classList.toggle('open');
    document.getElementById('toggle').classList.toggle('x');
  }

  function closeMenu() {
    if (menu.classList.contains('open')) {
      toggleMenu();
    }
  }

  menu.addEventListener('click', function(e) {
    if (e.target.classList.contains('pure-menu-item')) {
      closeMenu();
    }
  });
  document.getElementById('toggle').addEventListener('click', function(e) {
    toggleMenu();
    e.preventDefault();
  });

  window.addEventListener(WINDOW_CHANGE_EVENT, closeMenu);


  /**
    Handles animation on swiper slide right after it's activation
  */
  function slideAnimation(s) {
    if (s.snapIndex === (s.prevActiveIndex || 0)) {
      // the same slide => skip animation
      return;
    }
    var slideElem = s.slides[s.snapIndex];
    var nestedSwiperSlide = slideElem.querySelector('.swiper-slide-active');
    if (nestedSwiperSlide) {
      console.log('NESTED SWIPER');
      slideElem = nestedSwiperSlide;
    }
    var animatedElems = slideElem.querySelectorAll('[data-animate], [data-animate-once]');
    var excluded = slideElem.querySelectorAll('.hidden [data-animate], .hidden [data-animate-once]');
    function isExcluded(node) {
      for (var i = 0; i < excluded.length; i++) {
        if (excluded[i] === node) {
          return true;
        }
      }
    }
    for (var i = 0; i < animatedElems.length; i++) {
      var elem = animatedElems[i];
      if (isExcluded(elem)) {
        continue;
      }
      var oneTimeAnimation = elem.getAttribute('data-animate-once');
      var animation = elem.getAttribute('data-animate') || oneTimeAnimation;
      elem.classList.remove('invisible');
      elem.classList.add('animated');
      elem.classList.add(animation);
      if (!oneTimeAnimation) {
        s.$(elem).once('animationend webkitAnimationEnd', function(el, animClass) {
          el.classList.remove('animated');
          el.classList.remove(animClass);
        }.bind(null, elem, animation));
      }
    }
    s.$('.swiper-slide:not(.swiper-slide-active) [data-animate], .swiper-slide:not(.swiper-slide-active) [data-animate-once]:not(.animated)', s.wrapper[0]).addClass('invisible');
    s.prevActiveIndex = s.snapIndex;
  }

  /** Main pages swiper **/
  var pageSwiperEl = document.querySelector('.page.swiper-container');
  if (pageSwiperEl) {
    var swiper = new Swiper(pageSwiperEl, {
      speed: 500,
      roundLengths: true,
      direction: 'vertical',
      slidesPerView: 'auto',
      centeredSlides: true,
      paginationClickable: true,
      spaceBetween: 0,
      mousewheelControl: true,
      // resistanceRatio: 0.15,

      // freeMode: true,
      // freeModeMomentum: false,
      // grabCursor: true,

      // Scrollbar
      scrollbar: '.main.swiper-scrollbar',
      scrollbarHide: true,
      scrollbarDraggable: !Swiper.prototype.support.touch,
      scrollbarSnapOnRelease: true,

      pagination: '.menu-pagination',
      paginationClickable: true,
      bulletClass: 'pure-menu-item',
      bulletActiveClass: 'pure-menu-selected',
      paginationBulletRender: function(swiper, index, className) {
        return swiper.paginationContainer[0].children[index].outerHTML;
      },
      onInit: function(sw) {
        document.body.setAttribute('page', sw.snapIndex);
        if (!Swiper.prototype.support.touch) {
          sw.container.addClass('scrollbar-control');
        }
      },
      onTransitionEnd: function(sw) {
        document.body.setAttribute('page', sw.snapIndex);
        var slideElem = sw.slides[sw.snapIndex];
        if (slideElem.classList.contains('scrolling')) {
          sw.disableMousewheelControl();
        } else {
          sw.enableMousewheelControl();
        }
        slideAnimation(sw);
      }
    });

    // Initialize links for swiper navigation
    swiper.$('[data-scroll]').on('click', function(evt) {
      var page = parseInt(evt.target.getAttribute('data-scroll'));
      evt.preventDefault();
      swiper.slideTo(page);
    });

    // A little workaround for hiding address bar on touch devices
    if (navigator.maxTouchPoints > 0) {
      window.scrollTo(0, 0);
      document.body.classList.add('scroll-hack');
      var initHeight = window.innerHeight;
      window.addEventListener( "resize", function(evt) {
        // console.log(initHeight+ ' vs '+window.innerHeight);
        if (window.innerHeight > initHeight) {
          document.body.classList.remove('scroll-hack');
        }
      });
      window.addEventListener( "scroll", function(evt) {
        // console.log(document.body.scrollTop);
        if (document.body.scrollTop > 60) {
          document.body.classList.remove('scroll-hack');
        }
      }, false);

      var prevSlide = 0;
      swiper.on('transitionEnd', function(sw) {
        if (sw.snapIndex === 0 && prevSlide > 0) {
          document.body.classList.add('scroll-hack');
        }
        prevSlide = sw.snapIndex;
      });
    }
  }


  /**  Tab Swipers  **/
  function initializeTabSwiper(pageElem) {
    new Swiper(pageElem.querySelector('.swiper-container'), {
      speed: 500,
      roundLengths: true,
      direction: 'horizontal',
      slidesPerView: 1,
      spaceBetween: 20,

      nextButton: pageElem.querySelector('.slide-button-next'),
      prevButton: pageElem.querySelector('.slide-button-prev'),

      pagination: pageElem.querySelector('.tabs-paginator'),
      paginationClickable: true,
      bulletClass: 'tab-item',
      bulletActiveClass: 'tab-item-selected',
      paginationBulletRender: function(swiper, index, className) {
        return swiper.paginationContainer[0].children[index].outerHTML;
      },
      onTransitionEnd: slideAnimation,
    });
  }
  var tabSwipers = document.querySelectorAll('.tabs-swiper');
  for (var i = 0; i < tabSwipers.length; i++) {
    initializeTabSwiper(tabSwipers[i]);
  }

  /** Swiper gallery **/
  function galleryLayout(sw) {
    if (sw.slides.length === 0) return;

    var layout = sw.width / sw.height > 1.2? 'horizontal' : 'vertical';
    sw.container.attr('layout', layout);

    var slideEl = sw.slides[sw.snapIndex];
    var imgEl = slideEl.querySelector('img');
    var imgRatio = imgEl.naturalWidth / imgEl.naturalHeight;

    var parent = imgEl.parentElement;
    var parentBox = parent.getBoundingClientRect()
    var padding = parseFloat(Dom7(parent).css('padding'));

    var containerBox = {
      top: parentBox.top+padding,
      left: parentBox.left+padding,
      width: parentBox.width-2*padding,
      height: parentBox.height-2*padding
    }
    // compute available space for image element
    var availableSpace;
    if (layout === 'horizontal') {
      availableSpace = {
        top: containerBox.top,
        left: containerBox.left,
        width: Math.min(containerBox.width * 0.8, containerBox.width-175),
        height: containerBox.height
      };
    } else {
      var h = Math.max(containerBox.width * 0.8, 150);
      availableSpace = {
        width: containerBox.width,
        height: h,
        top: containerBox.top + (containerBox.height - h), // align bottom
        left: containerBox.left
      };
    }

    // compute a visible image bounds inside availableSpace
    var objPos = Dom7(imgEl).css('object-position').split(' ');
    var imgRatio = imgEl.naturalWidth / imgEl.naturalHeight;
    var elemRatio = availableSpace.width / availableSpace.height;
    var box;
    if (elemRatio > imgRatio) {
      var objPosX = parseFloat(objPos[0].replace('%', '')/100);
      var imgWidth = availableSpace.height * imgRatio;
      var offset = (availableSpace.width - imgWidth) / 2;
      box = {
        top: availableSpace.top,
        left: availableSpace.left + offset,
        right: availableSpace.left + offset + imgWidth,
        width: imgWidth,
        height: availableSpace.height,
      }
    } else {
      var objPosY = parseFloat(objPos[1].replace('%', '')/100);
      var imgHeight = availableSpace.width / imgRatio;
      var offset = (availableSpace.height - imgHeight) * objPosY;
      box = {
        top: availableSpace.top + offset,
        left: availableSpace.left,
        right: availableSpace.left + availableSpace.width,
        width: availableSpace.width,
        height: imgHeight,
      }
    }

    // apply layout settings for all slides
    for (var i = 0; i < sw.slides.length; i++) {
      slideEl = sw.slides[i];
      var panelEl = Dom7('.image-panel', slideEl);
      if (layout === 'horizontal') {
        panelEl.css({
          width: px(containerBox.width - availableSpace.width),
          height: px(box.height)
        });
      } else {
        panelEl.css({
          width: '',
          height: px(containerBox.height - box.height)
        });
      }
      Dom7('img', slideEl).css('minWidth', px(box.width));
    }

    // toolbar layout
    var toolbarEl = sw.container.find('.gallery-toolbar');
    if (layout === 'horizontal') {
      toolbarEl.css({
        width: px(containerBox.width - availableSpace.width),
        left: px(box.left + box.width),
        top: px(box.top)
      });
    } else {
      toolbarEl.css({
        width: '',
        left: '',
        top: ''
      });
    }

    sw.layoutParams = {
      imgBox: box,
      imgAvailableBox: availableSpace
    };

    // Dom7('.available').css({
    //   top: px(availableSpace.top),
    //   left: px(availableSpace.left),
    //   width: px(availableSpace.width),
    //   height: px(availableSpace.height)
    // })

    // Dom7('.image').css({
    //   top: px(box.top),
    //   left: px(box.left),
    //   width: px(box.width),
    //   height: px(box.height)
    // })
  }


  function px(value) {
    return parseInt(value)+'px';
  }

  function openGallery(evt, index) {
    var box = evt.target.getBoundingClientRect();
    var elem = Dom7(evt.target.cloneNode(true));
    elem.addClass('thumbnail');

    elem.css({
      position: 'fixed',
      top: box.top + 'px',
      left: box.left + 'px',
      width: box.width + 'px',
      height: box.height + 'px'
    });

    var galleryElem = document.querySelector('.swiper-container-gallery');
    var slidesWrapper = document.querySelector('.gallery-images').cloneNode(true);
    galleryElem.appendChild(slidesWrapper);
    galleryElem.style.display = 'block';
    var gallerySwiper = new Swiper('.swiper-container-gallery', {
      speed: 500,
      threshold: 20,
      // effect: 'fade',
      roundLengths: true,
      direction: 'horizontal',
      slidesPerView: 1,
      // zoom: true,
      // zoomMax: 1,
      initialSlide: index,
      keyboardControl: true,

      nextButton: '.swiper-container-gallery .button-next',
      prevButton: '.swiper-container-gallery .button-prev',
      pagination: '.swiper-container-gallery .swiper-pagination',
      paginationType: 'fraction',
      paginationClickable: true,

      onTransitionEnd: slideAnimation,
      onInit: setTimeout.bind(null, function(sw) {
        sw.container.removeClass('zoom-mode');
        galleryLayout(sw);
        slideAnimation(sw);
      }, gallerySwiper)
    });
    gallerySwiper.prevActiveIndex = -1;
    gallerySwiper.on('doubleTap', function(s, evt) {
      if (evt.target.tagName === 'IMG') {
        s.container.toggleClass('zoom-mode');
        // galleryLayout(s);
      }
    });

    gallerySwiper.updateLayout = galleryLayout.bind(null, gallerySwiper);
    window.addEventListener('resize', gallerySwiper.updateLayout);

    document.body.appendChild(elem[0]);
    // Open animation
    setTimeout(function() {
      document.body.classList.add('modal-open');
      galleryElem.style.opacity = 1;

      var endBox = gallerySwiper.layoutParams.imgBox;
      elem.transitionEnd(function() {
        elem.remove();
        galleryElem.classList.add('initialized');
      });

      elem.addClass('animated');

      var dx = endBox.left - box.left;
      var dy = endBox.top - box.top;
      var sx = endBox.width / box.width;
      var sy = endBox.height / box.height;

      elem.transform('translate3d('+dx+'px,'+dy+'px,0) scale3d('+sx+','+sy+',1)');
    }, 30);

    function close() {
      document.body.classList.remove('modal-open');
      galleryElem.style.opacity = 0;
      setTimeout(function() {
        window.removeEventListener('resize', gallerySwiper.updateLayout);
        gallerySwiper.removeAllSlides();
        gallerySwiper.destroy();
        galleryElem.style.display = '';
        galleryElem.classList.remove('initialized');
        slidesWrapper.remove();
        gallerySwiper = null;
      }, 500);
    }
    function keyHandler(evt) {
      if (evt.keyCode === 27) {
        document.removeEventListener('keydown', keyHandler);
        close();
      }
    }
    gallerySwiper.$('.dialog-close').once('click', close);
    var keyListener = document.addEventListener('keydown', keyHandler);
  }


  Dom7('.thumbnails .thumbnail svg').on('click', function(evt) {
    var index = parseInt(evt.target.getAttribute('data-gallery-index')) || 0;
    openGallery(evt, index);
  });

  Dom7('[data-animate], [data-animate-once]').addClass('invisible');


  /** Scrolling slides (nested in main swiper) **/
  new Swiper('.swiper-container.nested', {
    roundLengths: true,
    direction: 'vertical',
    slidesPerView: 'auto',
    nested: true,
    mousewheelControl: true,
    scrollbarDraggable: true,
    
    // slidesPerView: 1,
    // slidesPerColumn: 6,
    // centeredSlides: true

    scrollbarHide: true,
    scrollbar : '.nested-swiper-scrollbar',
    freeMode: true,
    onProgress: function(sw, progress) {
      // console.log('progress: '+progress);
      // console.log(sw._progressStack)
      if (!sw._progressStack) {
        sw._progressStack = [-1,-1,-1, -1];;
      }
      if ((progress === 0 || progress === 1)
          && sw._progressStack[0] === progress
          && sw._progressStack[1] === progress
          && sw._progressStack[2] === progress) {
        swiper.enableMousewheelControl();
      }
      sw._progressStack.push(progress);
      sw._progressStack.splice(0, 1);
    },
    onInit: function(s) {
      if (!Swiper.prototype.support.touch) {
        s.container.addClass('scrollbar-control');
      }
    }
  });

  new Swiper('.development .swiper-container', {
    speed: 500,
    roundLengths: true,
    nextButton: '.slide-button-next',
    prevButton: '.slide-button-prev',
    slideActiveClass: 'active-slide',// workaround for nested slide animations
    slidesPerView: 2,
    resistanceRatio: 0,
    breakpoints: {
      1200: {
        slidesPerView: 1.5,
      },
      1000: {
        slidesPerView: 1.25
      },
      600: {
        slidesPerView: 1
      }
    }
  });
})(this, this.document);
