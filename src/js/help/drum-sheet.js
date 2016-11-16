(function() {
  'use strict';

  angular
    .module('bd.help')
    .directive('bdHelpDrumSheet', drumSheet);

  function drumSheet() {

    var sheetTemplate = 
      '<div class="help-drum-sheet">'+
        '<div layout="column" class="drums-labels-container">'+
          '<img ng-repeat="drum in workspace.drumSection.instrument track by drum.name" ng-src="{{ ::drum.image }}">'+
        '</div>'+
        '<div layout="row">'+
          '<div flex '+
            'ng-repeat="slide in workspace.beatSlides" '+
            'ng-include="\'views/drums_board_slide.html\'" '+
            'class="beat-container beat instrument-slide">'+
          '</div>'+
        '</div>'+
      '</div>';

    return {
      restrict: 'A',
      scope: {
        config: '=bdHelpDrumSheet'
      },
      template: '',
      controller: function($scope, $element, $mdCompiler, Drums, DrumSection, basicHandler) {
        function createSlide(beat) {
          return {
            id: beat,
            initialized: true,
            visible: true,
            beat: $scope.workspace.trackSection.beat(1, beat),
            type: 'drums'
          }
        }
        function addSound(bar, beat, subbeat, drum, volume) {
          $scope.workspace.trackSection.subbeat(bar, beat, subbeat)[drum].volume = volume;
        }
        $scope.initializeWorkspace = function(config) {
          var numbers = (config.timeSignature || '4/4').split('/');
          var timeSignature = {
            top: numbers[0],
            bottom: numbers[1]
          };
          var drumKit = Drums.Drums.slice(4);
          $scope.workspace = {
            selected: basicHandler.selected,
            section: {
              timeSignature: timeSignature,
              length: config.length || 1
            },
            drumSection: {
              instrument: drumKit
            }
          };
          $scope.workspace.trackSection = new DrumSection($scope.workspace.section);
          $scope.workspace.beatSlides = [createSlide(1), createSlide(2)];
          $scope.workspace.addSound = addSound;

          var template = '<div ng-controller="{0}">'.format($scope.config.controller)+sheetTemplate+'</div>';
          $mdCompiler.compile({
            template: template
          }).then(function(compileData) {
            //attach controller & scope to element
            var sheetElem = compileData.link($scope);//.$new(false)
            $element.append(sheetElem);
          });
        };
        $scope.initializeWorkspace($scope.config || {});
      }
    };
  }


})();