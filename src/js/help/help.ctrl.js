(function() {
  'use strict';

  angular
    .module('bd.help')
    .controller('HelpController', HelpController);

  function HelpController($scope, $element, $timeout, Bass, BassSection, basicHandler) {

    $scope.index = {
      activeSection: 1
    };

    var animatedSlides;
    var timer;
    function showStep(slides, step) {
      console.log('SHOW SLIDE '+step)
      slides[step]();
      var nextStep = (step+1) % (slides.length);
      timer = $timeout(
        showStep.bind(this, slides, nextStep),
        1500
      );
    }

    $scope.$on('duScrollspy:becameActive', function($event, $element, $target) {
      console.log($target);
      if (animatedSlides) {
        if (timer) {
          $timeout.cancel(timer);
          timer = null;
        }
        $timeout(animatedSlides[animatedSlides.length-1]);
        animatedSlides = null;
      }

      var instructionsElem = angular.element($target[0].querySelector('div[bd-help-bass-sheet] > div'));
      if (instructionsElem.length) {
        animatedSlides = instructionsElem.scope().instructions;
        $timeout(function() {
          showStep(animatedSlides, 0)
        });
      }
      
      var id = $target[0].getAttribute('id');
      $scope.index.activeSection = parseInt(id.replace('section-', ''));
    });
    /*
    var container = angular.element(document.getElementById('container'));
    container.on('scroll', function(evt) {
      var active = $element[0].querySelector('.index .active');
      console.log(active);
      // console.log('Container scrolled to ', container.scrollLeft(), container.scrollTop());
    });
    */
  }

})();