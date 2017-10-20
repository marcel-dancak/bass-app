(function() {
  'use strict';

  angular
    .module('bd.app')


  class SoundSelector {

    constructor() {
      this.all = [];
      this.last = null;
    }

    select(sound, flags) {
      flags = flags || {};
      if (!flags.add && !flags.toggle) {
        this.clearSelection();
      }

      var index = this.all.indexOf(sound);
      // if already selected, revert selection
      if (flags.toggle && index !== -1) {
        this.all[index].selected = false;
        this.all.splice(index, 1);
        if (this.last === sound) {
          this.last = this.all[this.all.length-1];
        }
        return;
      }

      if (sound.selected === undefined) {
        Object.defineProperty(sound, 'selected', {value: 'static', writable: true});
      }
      sound.selected = true;
      this.last = sound;

      if (index === -1) {
        this.all.push(this.last);
      }
    }

    clickSelect(evt, sound) {
      this.select(sound, { toggle: evt.ctrlKey });
    }

    selectMultiple(selection, flags) {
      flags = flags || {};

      if (!flags.add && !flags.toggle) {
        this.clearSelection();
      }

      flags.add = true;
      selection.forEach(function(s) {
        this.select(s, flags);
      }, this);
    }

    clearSelection() {
      this.all.forEach((s) => {
        s.selected = false;
      });
      this.all.length = 0;

      this.last = null;
    }
  }

  angular
    .module('bd.app')
    .value('SoundSelector', SoundSelector)
})();