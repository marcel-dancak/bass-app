(function() {
  'use strict';

  angular
    .module('bd.help')
    .directive('bdHelpBassSheet', bassSheet);

  function bassSheet() {

    var sheetTemplate = 
      '<div class="help-bass-sheet strings-{{ ::workspace.track.instrument.strings.length }} name">'+
        '<div class="strings-labels">'+
          '<p ng-repeat="string in workspace.track.instrument.strings | orderBy:string.index:\'-\' track by string.index">'+
            '{{ ::string.label }}<sub class="octave-index">{{ ::string.octave }}</sub><br>'+
          '</p>'+
        '</div>'+
        '<div class="beats-container" layout="row">'+
          '<div flex '+
            'ng-repeat="slide in workspace.beatSlides" '+
            'ng-include="\'views/editor/bass_beat2.html\'" '+
            'class="beat-container beat instrument-slide">'+
          '</div>'+
        '</div>'+
      '</div>';

    return {
      restrict: 'A',
      scope: {
        config: '=bdHelpBassSheet'
      },
      template: '',
      controller: function($scope, $element, $mdCompiler, Bass, TrackSection, basicHandler) {
        function createSlide(beat) {
          return {
            id: beat,
            initialized: true,
            visible: true,
            beat: $scope.workspace.trackSection.beat(1, beat),
            type: 'bass'
          }
        }

        $scope.initializeWorkspace = function(config) {
          var numbers = (config.timeSignature || '4/4').split('/');
          var timeSignature = {
            top: numbers[0],
            bottom: numbers[1]
          };
          $scope.workspace = {
            selected: basicHandler.selected,
            section: {
              timeSignature: timeSignature,
              length: config.length || 1
            },
            track: {
              instrument: new Bass({strings: config.strings || 'EADG'})
            }
          };
          $scope.workspace.trackSection = new TrackSection($scope.workspace.section, []);
          $scope.workspace.beatSlides = [];
          for (var i = 1; i <= (config.size || 2); i++) {
            $scope.workspace.beatSlides.push(createSlide(i));
          }

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