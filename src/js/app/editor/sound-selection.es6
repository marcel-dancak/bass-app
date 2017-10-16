(function() {
  'use strict';

  angular
    .module('bd.app')


  function soundContainerElem(elem) {
    var e = elem;
    var maxDepth = 10;
    while (e.className.indexOf("sound-container") === -1) {
      //console.log(e.className);
      e = e.parentElement;
      if (maxDepth-- === 0) {
        return null;
      };
    }
    return e;
  }

  class SoundSelector {

    constructor(swiperControl) {
      this.swiperControl = swiperControl;
      this.all = [];
      this.last = {
        sound: null,
        element: null
      };
    }

    forSelectedSound(fn, obj) {
      if (obj) {
        fn = fn.bind(obj);
      }
      this.all.forEach((item) => {
        fn(item.sound);
      });
    }

    select(element, sound, flags) {
      var element = soundContainerElem(element); // || swiperControl.getSoundElem(sound)
      flags = flags || {};
      if (!flags.add && !flags.toggle) {
        this.clearSelection();
      }

      var index = this.all.findIndex((item) => {
        return item.sound === sound;
      });
      // if already selected, revert selection
      if (flags.toggle && index !== -1) {
        this.all[index].element.classList.remove('selected');
        this.all.splice(index, 1);
        return;
      }

      this.last.sound = sound;
      this.last.element = element;

      if (index === -1) {
        this.last.element.classList.add('selected');
        this.all.push(Object.assign({}, this.last));
      }
    }

    clickSelect(evt, sound) {
      this.select(evt.target, sound, { toggle: evt.ctrlKey });
    }

    selectMultiple(selection, flags) {
      flags = flags || {};

      if (!flags.add && !flags.toggle) {
        this.clearSelection();
      }

      flags.add = true;
      selection.forEach(function(item) {
        this.select(item.element, item.sound, flags);
      }, this);
    }

    clearSelection() {
      this.all.forEach((item) => {
        item.element.classList.remove('selected');
      });
      this.all.length = 0;

      this.last.sound = null;
      this.last.element = null;
    }
  }

  angular
    .module('bd.app')
    .value('SoundSelector', SoundSelector)
})();