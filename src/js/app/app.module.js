(function() {
  'use strict';
  angular
    .module('templates', []); // module for compiled templates
  angular
    .module(
      'bd.app', [
        'templates',
        'ngMaterial',
        'ngSanitize',
        'ang-drag-drop',
        'angularResizable',
        'monospaced.mousewheel'
    ]);
})();
