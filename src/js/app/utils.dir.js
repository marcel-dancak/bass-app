(function() {
  'use strict';

  angular
    .module('bd.app')
    .directive('bdTextarea', bdTextarea)
    .directive('ngRightClick', contextMenu)

  function contextMenu($parse) {
    return function(scope, element, attrs) {
      var fn = $parse(attrs.ngRightClick);
      element.bind('contextmenu', function(event) {
        scope.$apply(function() {
          event.preventDefault();
          fn(scope, {$event:event});
        });
      });
    };
  }

  function bdTextarea($timeout) {
    return {
      scope: {
        model: '=bdTextarea',
      },
      template:
        '<textarea aria-label="Text" spellcheck="false" md-no-resize ng-model="model" ng-blur="setEditMode(false)"></textarea>'+
        '<span ng-click="setEditMode(true)" ng-bind="model"></span>',
      controller: function($scope, $element) {
        $scope.editMode = true;
        $scope.setEditMode = function(edit) {
          $scope.editMode = edit;
          if (edit) {
            $timeout(function() {
              $element[0].querySelector('textarea').focus();
              $scope.$broadcast('md-resize-textarea');
            });
          }
        }
      }
    };
  }

})();