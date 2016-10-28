(function() {
  'use strict';

  angular
    .module('bd.help')
    .controller('HelpController', HelpController);

  function HelpController($scope, $element, $timeout, Bass, BassSection, basicHandler) {

    $scope.index = {
      activeSection: 1,
      activeStep: 1
    };
    $scope.page = null;

    $scope.setHelpPage = function(page) {
      stopAnimation();
      $scope.page = page;
    };
    $timeout(function() {
      $scope.page = $scope.helpPages[0];
    });

    var animatedSlides;
    var timer = null;
    function showStep(slides, step) {
      console.log('SHOW SLIDE '+step)
      $scope.index.activeStep = step + 1;
      slides[step]();
      var nextStep = (step+1) % (slides.length);
      timer = $timeout(
        showStep.bind(this, slides, nextStep),
        1500
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
      var instructionsElem = angular.element($target[0].querySelector('div[bd-help-bass-sheet] > div'));
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
  }

})();
