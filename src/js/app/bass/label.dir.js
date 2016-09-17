(function() {
  'use strict';

  angular
    .module('bd.app')
    .directive('bdSoundLabel', soundLabel);

  function soundLabel() {
    return {
      scope: {
        sound: '=sound'
      },
      templateUrl: 'views/bass_sound_label.html'
    };
  }

})();