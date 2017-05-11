(function() {
  'use strict';

  angular
    .module('bd.app')

    .factory('drumHandler', drumHandler)
    .controller('DrumController', DrumController);


  /***************** Private helper functions ******************/



  var dragBox = {
    elem: angular.element(
      '<div class="drum drag-box"><div class="volume-meter"></div></div>'
    )[0],
  };

  var dropBox = {
    elem: angular.element('<div class="drum drop-box"></div>')[0],
    setPxStyles: function(styles) {
      // Object.keys(styles).forEach(function(key))
      for (var key in styles) {
        this.elem.style[key] = styles[key]+'px';
      }
    }
  };


  function drumHandler(workspace, $mdUtil) {
    var dragSound;

    document.body.appendChild(dragBox.elem);
    document.body.appendChild(dropBox.elem);


    var scope = angular.element(document.body).scope();
    scope.$on('ANGULAR_DRAG_START', function(e, evt, channel, data) {
      if (channel === 'drum') {
        dragSound = data.data;
        dragBox.elem.lastChild.style.transform = 'scale({0}, {0})'.format(dragSound.volume);
        evt.dataTransfer.setDragImage(dragBox.elem, 10, 12);
        if (!evt.ctrlKey) {
          setTimeout(function() {
            evt.target.classList.add('drag-move-element');
          }, 80);
        }
        dropBox.elem.style.opacity = 1;
      }
    });
    scope.$on('ANGULAR_DRAG_END', function(e, evt, channel, data) {
      if (channel === 'drum') {
        if (evt.target) {
          evt.target.classList.remove('drag-move-element');
        }
        dropBox.elem.style.opacity = 0;
      }
    });


    var drumsVolumeLevels = [0.0, 0.85, 0.4];

    function getSoundGrid(evt, beat) {
      var container = evt.target;
      while (!container.classList.contains('drums-beat')) {
        container = container.parentElement;
      }
      var box = container.getBoundingClientRect();
      var x = evt.clientX - box.left;
      var y = evt.clientY - box.top;

      var subbeat = 1 + parseInt((x * (beat.grid||beat.subdivision)) / box.width);
      var drumIndex = parseInt(y / 48);
      var drum = workspace.track.instrument[drumIndex].name;
      
      return {
        subbeat: subbeat,
        start: (subbeat - 1) / (beat.grid||beat.subdivision),
        drum: drum,
        drumIndex: drumIndex,
        containerElem: container
      };
    }

    return {
      click: function(evt, beat) {
        var grid = getSoundGrid(evt, beat);
        var sound = workspace.trackSection.sound(beat, {start: grid.start, drum: grid.drum});
        if (sound) {
          var index = drumsVolumeLevels.indexOf(sound.volume);
          var nextIndex = (index+1) % drumsVolumeLevels.length;
          sound.volume = drumsVolumeLevels[nextIndex];
          if (sound.volume < 0.05) {
            console.log('REMOVE sound');
            workspace.trackSection.deleteSound(sound);
          }
        } else {
          console.log('ADD sound')
          sound = {start: grid.start, drum: grid.drum, volume: 0.85};
          workspace.trackSection.addSound(beat, sound);
        }
      },
      volumeScroll: function(evt, beat, step) {
        var sound = angular.element(evt.target).scope().sound;
        if (sound) {
          sound.volume += step;
          if (sound.volume < 0.05) {
            workspace.trackSection.deleteSound(sound);
          } else if (sound.volume > 1) {
            sound.volume = 1;
          }
        }
      },

      onDragOver: function(evt, beat) {
        var grid = getSoundGrid(evt, beat);
        var beatBox = grid.containerElem.getBoundingClientRect();

        var subbeatWidth = beatBox.width / (beat.grid||beat.subdivision);
        var offset = subbeatWidth / 2 -17;
        dropBox.setPxStyles({
          left: beatBox.left + (grid.subbeat - 1) * subbeatWidth + offset,
          top: beatBox.top + grid.drumIndex * 48 + 7
        });
      },
      onDragEnter: function(evt, beat) {
        // dropBox.elem.style.opacity = 1;
      },
      onDragLeave: function(evt, beat) {
        // dropBox.elem.style.opacity = 0;
      },
      onDrop: function(evt, beat) {
        var grid = getSoundGrid(evt, beat);

        var destSound = workspace.trackSection.sound(beat, {start: grid.start, drum: grid.drum});
        if (destSound) {
          if (destSound === dragSound) {
            return;
          }
          destSound.volume = dragSound.volume;
        } else {
          destSound = {
            volume: dragSound.volume,
            start: grid.start,
            drum: grid.drum
          };
          workspace.trackSection.addSound(beat, destSound);
        }
        if (evt.dataTransfer.dropEffect === 'move') {
          // nextTick improves animation
          $mdUtil.nextTick(workspace.trackSection.deleteSound.bind(workspace.trackSection, dragSound));
          // workspace.trackSection.deleteSound(dragSound);
        }
      }
    }
  }


  function DrumController($scope, drumHandler) {
    $scope.editor = drumHandler;
  }

})();