(function() {
  'use strict';

  angular
    .module('bd.help')
    .controller('HelpController', HelpController);


  function HelpController($scope, $element, $timeout) {

    $scope.index = {
      activeSection: -1,
      activeStep: -1
    };
    $scope.page = null;

    $scope.setHelpPage = function(page) {
      stopAnimation();
      $scope.page = page;
    };
    $timeout(function() {
      $scope.page = $scope.helpPages[0];
      // Manually trigger section by 1px scroll when automatic selection fails
      // (sometimes happens when scrollbar is not needed on first page)
      $timeout(function() {
        if ($scope.index.activeSection === -1) {
          var container = $element[0].querySelector('#'+$scope.page.containerId);
          angular.element(container).scrollTo(0, 1);
        }
      }, 500);
    }, 200);

    var animatedSlides;
    var timer = null;
    function showStep(slides, step) {
      $scope.index.activeStep = step + 1;
      var delay = slides[step]() || 1500;
      var nextStep = (step+1) % (slides.length);
      timer = $timeout(
        showStep.bind(this, slides, nextStep),
        delay
      );
    }

    function stopAnimation() {
      console.log('stopAnimation');
      if (animatedSlides) {
        if (timer !== null) {
          $timeout.cancel(timer);
          timer = null;
        }
        $timeout(animatedSlides[animatedSlides.length-1]);
        animatedSlides = null;
      }
    }

    $scope.$on('duScrollspy:becameActive', function($event, $element, $target) {
      var id = $target[0].getAttribute('id');
      var sectionIndex = parseInt(id.replace('section-', ''));

      stopAnimation();
      var instructionsElem = angular.element($target[0].querySelector('.slideshow > div'));
      if (instructionsElem.length) {
        animatedSlides = instructionsElem.scope().instructions;
        $timeout(function() {
          // filter to only last active 'duScrollspy:becameActive' event
          if ($scope.index.activeSection === sectionIndex) {
            console.log('starting animation');
            showStep(animatedSlides, 0);
          }
        }, 300);
      }
      $scope.index.activeSection = sectionIndex;
    });


    $scope.scrollTo = function(sectionIndex) {
      var container = $element[0].querySelector('#'+$scope.page.containerId);
      var section = container.querySelector('#section-'+sectionIndex);
      if (section) {
        angular.element(container).scrollToElementAnimated(section);
      }
    };
    $scope.$on('$destroy', function() {
      stopAnimation();
    });
  }

})();
