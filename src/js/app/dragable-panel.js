(function() {
  'use strict';

  angular
  .module('bd.app')
  .directive('rcDrag', rcDragDirective)
  .factory('dragablePanel', dragablePanel)


  function rcDragDirective($window, $document) {

    var moveThreshold = 100;

    var documentListenersActive = false;
    var rAFPending = false;
    var mouseStart = null;
    var mouseLast = null;
    var mouseDelta = {x: 0, y: 0};
    var offset = {x: 0, y: 0};
    var target;
    var bounds;

    function setupDocumentListeners() {
      if (!documentListenersActive) {
        $document.on('mousemove', mousemove);
        $document.on('mouseup', mouseup);
        documentListenersActive = true;
      }
    }

    function takedownDocumentListeners() {
      if (documentListenersActive) {
        $document.off('mousemove', mousemove);
        $document.off('mouseup', mouseup);
        documentListenersActive = false;
      }
    }

    function updateViewport() {
      target.css('transform', 'translate('+ (offset.x + mouseDelta.x) +'px,'+ (offset.y + mouseDelta.y) +'px)');
    }

    function requestUpdateViewport() {
      if (!rAFPending) {
        $window.requestAnimationFrame(function() {
          updateViewport();
          rAFPending = false;
        });
        rAFPending = true;
      }
    }

    function mousedown(ev) {
      var container = ev.target;
      while (!container.classList.contains('md-panel')) {
        container = container.parentElement;
      }
      var targetBounds = container.getBoundingClientRect();
      bounds = {
        left: ev.pageX - targetBounds.left,
        top: ev.pageY - targetBounds.top,
        right: window.innerWidth - (targetBounds.right - ev.pageX),
        bottom: window.innerHeight - (targetBounds.bottom - ev.pageY)
      };
      mouseStart = {x: ev.pageX, y: ev.pageY};
      mouseLast = mouseStart;
      setupDocumentListeners();
    }

    function mousemove(ev) {
      var x = Math.min(Math.max(ev.pageX, bounds.left), bounds.right);
      var y = Math.min(Math.max(ev.pageY, bounds.top), bounds.bottom);
      if (mouseLast === null || Math.abs(x - mouseLast.x) > moveThreshold || Math.abs(y - mouseLast.y) > moveThreshold) {
        mouseStart = null;
        mouseup();
      }
      else {
        
        mouseLast = {x: x, y: y};
        mouseDelta = {x: (x - mouseStart.x), y: (y - mouseStart.y)};
        requestUpdateViewport();
      }
      ev.stopPropagation();
      ev.preventDefault();
    }

    function mouseup() {
      if (mouseStart !== null) {
        offset.x += mouseDelta.x;
        offset.y += mouseDelta.y;
        mouseDelta = {x: 0, y: 0};
      }
      mouseStart = null;
      mouseLast = null;
      takedownDocumentListeners();
    }

    function link(scope, elem, attrs) {
      target = elem.parent();
      var initTransform = target.css('transform');
      if (initTransform) {
        var re = /translate\((.+)\)/
        var match = initTransform.match(re)
        if (match) {
          var coords = match[1].split(',').map(parseFloat);
          offset.x = coords[0];
          offset.y = coords[1];
        }
      }

      angular.element(elem[0].querySelector(attrs.rcDrag)).bind('mousedown', mousedown);
      // elem.bind('mousedown', mousedown);

      scope.$on('$destroy', function() {
        takedownDocumentListeners();
      });
    }

    return {
      restrict: 'A',
      link: link
    };
  }


  function dragablePanel($window, $document, $mdPanel) {
    var panelsPositions = {};
    return {
      open: function(options) {
        return $mdPanel.open(
          angular.extend(options, {
            propagateContainerEvents: true,
            onDomAdded: function(args) {
              var panel = args[1].panelEl;
              var scope = args[1].config.scope;
              
              if (!scope.close) {
                scope.close = args[1].close.bind(args[1]);
              }
              rcDragDirective($window, $document).link(scope, panel, {rcDrag: '.dialog-header'});

              var lastPosition = panelsPositions[options.id];
              if (lastPosition) {
                panel.css({top: 0, left: 0});
                panel.css('transform', 'translate3d('+Math.round(lastPosition.left)+'px, '+ Math.round(lastPosition.top) +'px, 0)');
              }
            },
            onRemoving: function(panel) {
              if (panel.config.id) {
                var bounds = panel.panelEl[0].getBoundingClientRect();
                panelsPositions[panel.config.id] = bounds;
              }
            },
            onDomRemoved: function(args) {
              var panelRef = args[0];
              delete $mdPanel._trackedPanels[panelRef.config.id];
              panelRef.destroy();
            }
          })
        );
      }
    };
  }

})();