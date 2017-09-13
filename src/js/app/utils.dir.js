(function() {
  'use strict';

  angular
    .module('bd.app')
    // .directive('bdTextarea', bdTextarea)
    .directive('ngRightClick', contextMenu)
    .directive('bdFileDrop', bdFileDrop)
    .directive('bdBinaryFileDrop', bdBinaryFileDrop)
    .directive('bdDataUrlFileDrop', bdDataUrlFileDrop)
    .directive('bdDisableStepValidator', bdDisableStepValidator)


  function bdDisableStepValidator($parse) {
    return {
      require: 'ngModel',
      link: function(scope, iElem, iAttrs, ngModel) {
        if (ngModel.$validators.step) {
          delete ngModel.$validators.step;
        }
      }
    }
  }

  function contextMenu($parse) {
    return function(scope, iElem, iAttrs) {
      var fn = $parse(iAttrs.ngRightClick);
      iElem.bind('contextmenu', function(event) {
        scope.$apply(function() {
          event.preventDefault();
          fn(scope, {$event:event});
        });
      });
    }
  }
/*
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
*/
  function setupDragAndDrop(scope, iElem, dropCallback, type) {
    function handleFileDrop(evt) {
      evt.stopPropagation();
      evt.preventDefault();
      iElem.removeClass('dragover');

      var files = evt.dataTransfer.files;
      var file = files[0];
      var reader = new FileReader();
      reader.onload = function(evt) {
        console.log('onload')
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
      switch (type) {
        case 'binary':
          return reader.readAsArrayBuffer(file);
        case 'url':
          return reader.readAsDataURL(file);
        default:
          reader.readAsText(file)
      }
    }

    function handleDragOver(evt) {
      evt.stopPropagation();
      evt.preventDefault();
      iElem.addClass('dragover');
      // Explicitly show this is a copy.
      evt.dataTransfer.dropEffect = 'copy';
    }
    function handleDragLeave(evt) {
      iElem.removeClass('dragover');
    }

    iElem.on('dragover', handleDragOver);
    iElem.on('dragleave', handleDragLeave);
    iElem.on('drop', handleFileDrop);

    scope.$$postDigest(function() {
      var inputEl = iElem.find('input');
      inputEl.on('change', function(evt) {
        if (evt.target.files) {
          evt.dataTransfer = {files: evt.target.files}
          handleFileDrop(evt);
        }
      });
    });
  }

  function bdFileDrop($parse) {
    return function(scope, iElem, iAttrs) {
      setupDragAndDrop(scope, iElem, $parse(iAttrs.bdFileDrop));
    }
  }

  function bdBinaryFileDrop($parse) {
    return function(scope, iElem, iAttrs) {
      setupDragAndDrop(scope, iElem, $parse(iAttrs.bdBinaryFileDrop), 'binary');
    }
  }

  function bdDataUrlFileDrop($parse) {
    return function(scope, iElem, iAttrs) {
      setupDragAndDrop(scope, iElem, $parse(iAttrs.bdDataUrlFileDrop), 'url');
    }
  }

})();