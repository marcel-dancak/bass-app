(function() {
  'use strict';

  angular
    .module('bd.help')
    .directive('bdHelpDrumSheet', drumSheet);

  function drumSheet() {

    var sheetTemplate = 
      '<div class="help-drum-sheet">'+
        '<div layout="column" class="drums-labels-container">'+

          '<md-icon '+
            'ng-repeat="drum in workspace.trackSection.instrument track by drum.name" '+
            'md-svg-icon="{{ ::\'drums:\'+ drum.name }}">'+
          '</md-icon>'+

        '</div>'+
        '<div layout="row">'+
          '<div flex '+
            'ng-repeat="slide in workspace.beatSlides" '+
            'class="beat-container beat instrument-slide">'+
            '<drum-beat '+
              'instrument="workspace.trackSection.instrument" '+
              'beat="workspace.trackSection.beat(slide.beat.bar, slide.beat.beat)">'+
            '</drum-beat>'+
          '</div>'+
        '</div>'+
      '</div>';

    return {
      restrict: 'A',
      scope: {
        config: '=bdHelpDrumSheet'
      },
      template: '',
      controller: function($scope, $element, $mdCompiler, Drums, DrumTrackSection, basicHandler) {
        function createSlide(beat) {
          return {
            id: beat,
            beat: $scope.workspace.trackSection.beat(1, beat),
            type: 'drums'
          }
        }
        $scope.initializeWorkspace = function(config) {
          var numbers = (config.timeSignature || '4/4').split('/');
          var timeSignature = {
            top: numbers[0],
            bottom: numbers[1]
          };
          var drumKit = Drums.Drums.slice(4);
          Drums.createIndex(drumKit);
          $scope.workspace = {
            selected: basicHandler.selected,
            section: {
              timeSignature: timeSignature,
              length: config.length || 1
            }
          };
          $scope.workspace2 = $scope.workspace;

          $scope.workspace.trackSection = new DrumTrackSection($scope.workspace.section, []);
          $scope.workspace.trackSection.instrument = drumKit;
          $scope.workspace.beatSlides = [createSlide(1), createSlide(2)];

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