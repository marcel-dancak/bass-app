(function() {
  'use strict';

  angular
  .module('ngAccordion', [])
  .directive('ngAccordion', ngAccordion)
  .directive('ngAccordionItem', ngAccordionItem)
  .directive('ngAccordionContent', ngAccordionContent)
  .service('ngAccordionUtils', ngAccordionUtils);


  /**
   * Helper service for collapsing & expanding DOM elements
   * with height animation.
   */
  function ngAccordionUtils($animateCss) {

    this.collapseElement = function(elem, duration, callback) {
      var height = elem[0].scrollHeight;
      elem.css('maxHeight', height+'px');
      var animator = $animateCss(elem, {
        from: {
          maxHeight: height+'px',
          opacity: 1
        },
        to: {
          maxHeight: '0px',
          opacity: 0
        },
        easing: 'ease-out',
        duration: duration || 0.4
      });
      animator.start().done(callback || angular.noop);
    };

    this.expandElement = function(elem, duration, callback) {
      var height = elem[0].scrollHeight;
      var animator = $animateCss(elem, {
        from: {
          maxHeight: '0px',
          opacity: 0
        },
        to: {
          maxHeight: height + 'px',
          opacity: 1
        },
        easing: 'ease-out',
        duration: duration || 0.4
      });
      animator.start().done(function() {
        elem.css('maxHeight', 'none');
        (callback || angular.noop)();
      });
    };
  }


  function ngAccordion(ngAccordionUtils) {
    return {
      scope: false,
      controller: function($scope) {
        this.expandedAccordion = null;
        this.collapseAccordion = function(accordion) {
          ngAccordionUtils.collapseElement(accordion.element, 0.3);
          accordion.expanded = false;
          this.expandedAccordion = null;
        };
        this.expandAccordion = function(accordion) {
          if (this.expandedAccordion) {
            this.collapseAccordion(this.expandedAccordion);
          }
          ngAccordionUtils.expandElement(accordion.element, 0.3);
          accordion.expanded = true;
          this.expandedAccordion = accordion;
        };
        this.toggleAccordion = function(accordion) {
          if (accordion.expanded) {
            this.collapseAccordion(accordion);
          } else {
            this.expandAccordion(accordion);
          }
        };

        $scope.$closeAccordion = function() {
          if (this.expandedAccordion) {
            this.collapseAccordion(this.expandedAccordion);
          }
        }.bind(this);
      }
    };
  }

  function ngAccordionItem() {
    return {
      scope: true,
      require: '^ngAccordion',
      controller: function($scope) {
        $scope.$accordion = {
          expanded: false,
          toggle: angular.noop
        };
      },
      link: function(scope, iElem, iAttrs, accordionController) {
        scope.$accordion['toggle'] = function() {
          accordionController.toggleAccordion(scope.$accordion);
        };
      }
    };
  }

  function ngAccordionContent() {
    return {
      restrict: 'EA',
      link: function(scope, iElem, iAttrs) {
        iElem.css('overflow', 'hidden');
        iElem.css('minHeight', '0');
        iElem.css('maxHeight', 0);
        scope.$accordion['element'] = iElem;
      }
    };
  };

})();
