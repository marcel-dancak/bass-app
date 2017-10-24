(function() {
  'use strict';

  angular
    .module('bd.app')
    .factory('soundAnimation', soundAnimation)


  function soundContainerElem(elem) {
    var e = elem;
    var maxDepth = 10;
    while (e.className.indexOf("sound-container") === -1) {
      //console.log(e.className);
      e = e.parentElement;
      if (maxDepth-- === 0) {
        return null;
      }
    }
    return e;
  }

  function soundAnimation() {
    return function(el, cl) {
      var soundEl = soundContainerElem(el);
      soundEl.classList.add('animated');

      if (cl) soundEl.classList.add(cl);
      var afterAnimation = function() {
        console.log('afterAnimation');
        soundEl.classList.remove('animated');
        if (cl) soundEl.classList.remove(cl);
        soundEl.removeEventListener('transitionend', afterAnimation);
      }
      soundEl.addEventListener('transitionend', afterAnimation);
    }
  }

})();