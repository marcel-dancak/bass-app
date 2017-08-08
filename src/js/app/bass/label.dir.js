(function() {
  'use strict';

  angular
    .module('bd.app')
    .directive('bdSoundLabel', soundLabel)
    .directive('bdBend', bendLabel)
    .constant('noteBendEffect', noteBendEffect)


  function noteBendEffect(sound) {
      if (!sound.note.bend) [];

      var transition = {};
      var transitions = [];
      for (var i = 0; i < sound.note.bend.length-1; i++) {
        var bend = sound.note.bend[i];
        var nextBend = sound.note.bend[i+1];
        var diff = nextBend - bend;
        var type = diff > 0.05? 'up' : diff < -0.05? 'down' : '';
        if (type !== transition.type) {
          transition = {
            type: type,
            size: 1,
            from: bend,
            to: nextBend
          };
          transitions.push(transition);
        } else {
          transition.size++;
          transition.to = nextBend;
        }
      }
      var unitSize = 100 / transitions.length;
      var height = 1.55;
      transitions.forEach(function(t) {
        t.flex = '1 1 {0}%'.format(t.size*unitSize);
        if (t.type) {
          t.height = (height * (Math.abs(t.to-t.from)))+'rem';
          if (t.type === 'up') {
            t.top = (height*(1-t.to))+'rem';
            t.path = "M0 100 Q 90 100 100 0";
          }
          if (t.type === 'down') {
            t.top = (height*(1-t.from))+'rem';
            t.path = "M0 0 Q 90 0 100 100";
          }
        }
      });
      return transitions;
  }

  function soundLabel(Note) {
    return {
      scope: {
        sound: '=sound',
        string: '=string'
      },
      templateUrl: 'views/bass_sound_label.html',
      replace: true
    };
  }

  function bendLabel() {
    return {
      scope: true,
      replace: true,
      template:
        '<div class="bend-symbol layout-row">'+
          '<div '+
            'ng-repeat="t in transitions track by $index"'+
            'ng-attr-type="{{ t.type }}"'+
            'ng-style="{flex: t.flex, height: t.height, top: t.top}">'+
            '<md-icon ng-if-start="t.type" md-svg-icon="arrow-{{ t.type }}"></md-icon>'+
            '<svg ng-if-end class="curve"'+
              'viewBox="0 0 100 100" preserveAspectRatio="none">'+
              '<path ng-attr-d="{{ t.path }}" />'+
            '</svg>'+
          '</div>'+
        '</div>',
      controller: function($scope, $element) {
        var sound = $scope.sound;
        $scope.transitions = [];

        $scope.$watchCollection('sound.note.bend', function(value) {
          // console.log('bend changed');
          $scope.transitions = noteBendEffect(sound);
        });
      }
    };
  }

})();