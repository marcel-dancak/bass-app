(function() {
  'use strict';
  angular
    .module('templates', []); // module for compiled templates
  angular
    .module(
      'bd.app', [
        'templates',
        'ngMaterial',
        'ang-drag-drop',
        'angularResizable',
        'monospaced.mousewheel',
        'rzModule',
        'sly',
        'bd.help',
        'bd.lang'
    ]);
})();
