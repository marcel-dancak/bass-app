(function() {
  'use strict';
  angular
    .module(
      'bd.help', [
        'ngMaterial',
        'duScroll'
    ])
    .value('duScrollBottomSpy', true)
    .value('duScrollOffset', 80)
    .value('duScrollGreedy', true);
})();
