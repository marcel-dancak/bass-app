(function() {
  'use strict';
  angular
    .module(
      'bd.help', [
        'templates',
        'ngMaterial',
        'duScroll',
        'ngAccordion'
    ])
    .value('duScrollBottomSpy', true)
    .value('duScrollOffset', 120)
    .value('duScrollGreedy', true);
})();
