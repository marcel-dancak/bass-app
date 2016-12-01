(function() {
  'use strict';
  angular
    .module('bd.lang', ['pascalprecht.translate'])
    .config(function ($translateProvider) {
      $translateProvider.preferredLanguage('en');
      $translateProvider.fallbackLanguage('en');
    });
})();
