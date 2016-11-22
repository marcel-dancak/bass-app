(function() {
  'use strict';

  angular
    .module('bd.app')
    .directive('bdTextarea', bdTextarea)
    .directive('ngRightClick', contextMenu)
    .directive('bdFileDrop', bdFileDrop)


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

  function bdFileDrop($parse) {
    return function(scope, iElem, iAttrs) {
      var dropCallback = $parse(iAttrs.bdFileDrop);

      function handleFileDrop(evt) {
        evt.stopPropagation();
        evt.preventDefault();

        var files = evt.dataTransfer.files;
        var file = files[0];
        var reader = new FileReader();
        reader.onload = function(evt) {
          scope.$apply(function() {
              var args = {
                $file: {
                  filename: file.name,
                  content: reader.result
                }
              };
              dropCallback(scope, args);
          });
        };
        reader.readAsText(file)
      }

      function handleDragOver(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        // Explicitly show this is a copy.
        evt.dataTransfer.dropEffect = 'copy';
      }

      iElem.on('dragover', handleDragOver);
      iElem.on('drop', handleFileDrop);
    };
  }

})();