(function() {
  'use strict';

  window.scale = 1;
  window.translate = [0, 0];

  function overrideAddEventListener(obj) {
    var addEventListener = obj.addEventListener;
    var removeEventListener = obj.removeEventListener;
    obj.addEventListener = function(t, fn, opt) {
      var _this = this;
      var fn2 = function(e) {
        if (!e._transformed) {
          e._transformed = true;
          if (e.clientX !== undefined) {
            Object.defineProperty(e, 'clientX', {value: translate[0] + e.clientX/scale, enumerable: true});
            Object.defineProperty(e, 'clientY', {value: translate[1] + e.clientY/scale, enumerable: true});
            Object.defineProperty(e, 'screenX', {value: translate[0] + e.screenX/scale, enumerable: true});
            Object.defineProperty(e, 'screenY', {value: translate[1] + e.screenY/scale, enumerable: true});
          }
        }
        fn.apply(_this, arguments);
      }
      fn._wrapperFn = fn2;
      return addEventListener.apply(_this, [t, fn2, opt]);
    };
    obj.removeEventListener = function(t, fn, opt) {
      return removeEventListener.apply(this, [t, fn._wrapperFn, opt]);
    }
  }

  overrideAddEventListener(document);
  overrideAddEventListener(HTMLElement.prototype);

  /*
  HTMLElement.prototype.addEventListener1 = HTMLElement.prototype.addEventListener;
  HTMLElement.prototype.addEventListener = function(t, fn, opt) {
    // console.log('addEventListener: '+t)
    // addEventListener.apply(this, arguments)
    // var _this = this;

    var fn2 = function(e) {
      if (!e._transformed) {
        e._transformed = true;
        if (e.clientX !== undefined) {
          Object.defineProperty(e, 'clientX', {value: translate[0] + e.clientX/scale, enumerable: true});
          Object.defineProperty(e, 'clientY', {value: translate[1] + e.clientY/scale, enumerable: true});
          Object.defineProperty(e, 'screenX', {value: translate[0] + e.screenX/scale, enumerable: true});
          Object.defineProperty(e, 'screenY', {value: translate[1] + e.screenY/scale, enumerable: true});
        }
      }
      // fn.apply(_this, arguments)
      fn(e);
    }
    this.addEventListener1(t, fn2, opt);
    listeners[fn] = fn2;
  }
  HTMLElement.prototype.removeEventListener1 = HTMLElement.prototype.removeEventListener;
  HTMLElement.prototype.removeEventListener = function(t, fn, opt) {
    this.removeEventListener1(t, listeners[fn], opt);
  }

  document.addEventListener1 = document.addEventListener;
  document.addEventListener = function(t, fn, opt) {
    // console.log('addEventListener: '+t)

    var fn2 = function(e) {
      if (!e._transformed) {
        e._transformed = true;

        if (e.clientX !== undefined) {
          Object.defineProperty(e, 'clientX', {value: translate[0] + e.clientX/scale, enumerable: true});
          Object.defineProperty(e, 'clientY', {value: translate[1] + e.clientY/scale, enumerable: true});
          Object.defineProperty(e, 'screenX', {value: translate[0] + e.screenX/scale, enumerable: true});
          Object.defineProperty(e, 'screenY', {value: translate[1] + e.screenY/scale, enumerable: true});
        }
      }
      fn(e);
    }
    document.addEventListener1(t, fn2, opt);
    listeners[fn] = fn2;
  }
  document.removeEventListener1 = document.removeEventListener;
  document.removeEventListener = function(t, fn, opt) {
    document.removeEventListener1(t, listeners[fn], opt);
  }
  */

  // var getBoundingClientRect1 = HTMLElement.prototype.getBoundingClientRect;
  HTMLElement.prototype.getBoundingClientRect1 = HTMLElement.prototype.getBoundingClientRect;
  HTMLElement.prototype.getBoundingClientRect = function() {
    // var bounds = getBoundingClientRect1.bind(this)();
    var bounds = this.getBoundingClientRect1();
    return {
      left: translate[0] + bounds.left/scale,
      right: translate[0] + bounds.right/scale,
      top: bounds.top/scale,
      bottom: bounds.bottom/scale,
      width: bounds.width/scale,
      height: bounds.height/scale
    };
  }


  var lastClickEl;
  var lastClick;
  var lastPos;
  var dragging;

  function clickEffect(e, size) {
    // console.log('clickEffect')
    // console.log(e)
    if (!e.isTrusted) {
      return;
    }
    var d = document.createElement("div");
    
    d.className = "clickEffect";
    d.style.transform = 'scale3d({0}, {0}, 1)'.format((size || 0.8)/window.scale);
    d.style.top = e.clientY + "px";
    d.style.left = e.clientX + "px";
    document.body.appendChild(d);
    d.addEventListener('animationend', d.remove);
    lastClickEl = d;
    lastPos = [e.clientX, e.clientY]
  }

  function mouseDown(e) {
    lastClick = [e.clientX, e.clientY];
    // setTimeout(clickEffect, 50, e);
    clickEffect(e);
    dragging = true;
  }
  function mouseUp(e) {
    console.log('mouseUp')
    var offset = Math.abs(e.clientX - lastClick[0]) + Math.abs(e.clientY - lastClick[1]);
    // console.log(offset);
    if (offset > 10) {
      clickEffect(e, 0.5);
    }
    dragging = false;
  }
  function mouseMove(e) {
    if (dragging) {
      var offset = Math.abs(e.clientX - lastPos[0]) + Math.abs(e.clientY - lastPos[1]);
      if (offset > 10) {
        clickEffect(e, 0.4);
      } else {
        // console.log('skippped')
      }
      // lastClickEl.style.left = e.clientX + 'px';
      // lastClickEl.style.top = e.clientY + 'px';
    }
  }

  // document.addEventListener('click', clickEffect, true);
  // document.addEventListener('contextmenu', clickEffect, true);
  document.addEventListener('mousedown', mouseDown, true);
  document.addEventListener('mouseup', mouseUp, true);
  document.addEventListener('mousemove', mouseMove, true);
  document.addEventListener('drag', mouseMove, true);
  document.addEventListener('drop', function() {
    console.log('drop');
    dragging = false;
  }, true);


  var step = 0;
  // window.scale = 1;
  // window.translate = [0, 0];
  function zoomTo(scale, xOffset, yOffset) {
    window.scale = scale;
    window.translate[0] = (-xOffset/100) * window.innerWidth;
    window.translate[1] = (-yOffset/100) * window.innerHeight;
    var t = 'scale3d({0}, {0}, 1) translate3d({1}%, {2}%, 0)'.format(scale, xOffset, yOffset);
    document.body.style.transform = t;
  }

  var steps = [
    function() {
      zoomTo(1.38, 0, 0);
      var editor = document.querySelector('.editor');
      editor.style.transition = 'filter 0.6s ease';
      // editor.style.filter = 'blur(2px) grayscale(0.5)';
    },
    function() {
      zoomTo(1.38, -12, 0);
    },
    function() {
      zoomTo(1.38, -27.5, 0);
    },
    function() {
      zoomTo(1, 0, 0);
      document.querySelector('.editor').style.filter = '';
    },
    function() {
      document.body.style.filter = 'blur(10px) grayscale(0.5)';
      document.body.style.cursor = 'none';
    },
    function() {
      document.body.style.filter = '';
      setTimeout(function() {
        document.body.style.cursor = '';
      }, 500);
    }
  ];

  window.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'a') {
      if (step >= steps.length) {
        step = 0;
      }
      steps[step++]();
      e.preventDefault();
    }
  });

})();