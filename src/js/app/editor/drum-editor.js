(function() {
  'use strict';

  angular
    .module('bd.app')

    .factory('drumEditor', drumEditor)
    .controller('DrumController', DrumController)

    .component('drumBeat', {
      scope: false,
      templateUrl: 'views/editor/drum_beat.html',
      bindings: {
        beat: '<',
        instrument: '<'
      },
      controller: 'DrumController as vm'
    });

  /***************** Private helper functions ******************/



  var dragBox = {
    elem: angular.element(
      '<div class="drum drag-box"><div class="volume-meter"></div></div>'
    )[0],
  };

  var dropBox = {
    elem: angular.element('<div class="drum drop-box"></div>')[0],
    setPxStyles(styles) {
      // Object.keys(styles).forEach(function(key))
      for (var key in styles) {
        this.elem.style[key] = styles[key]+'px';
      }
    }
  };


  function drumEditor(workspace, $mdUtil, $rootScope, SoundSelector) {
    var selector = new SoundSelector();

    var dragSound;

    document.body.appendChild(dragBox.elem);
    document.body.appendChild(dropBox.elem);

    $rootScope.$on('ANGULAR_DRAG_START', (e, evt, channel, data) => {
      if (channel === 'drum') {
        dragSound = data.data;
        dragBox.elem.lastChild.style.transform = 'scale({0}, {0})'.format(dragSound.volume);
        evt.dataTransfer.setDragImage(dragBox.elem, 10, 12);
        if (!evt.ctrlKey) {
          setTimeout(() => {
            evt.target.classList.add('drag-move-element');
          }, 80);
        }
        dropBox.elem.style.opacity = 1;
      }
    });
    $rootScope.$on('ANGULAR_DRAG_END', (e, evt, channel, data) => {
      if (channel === 'drum') {
        if (evt.target) {
          evt.target.classList.remove('drag-move-element');
        }
        dropBox.elem.style.opacity = 0;
      }
    });


    var drumsVolumeLevels = [0.0, 0.85, 0.4];

    function getSoundGrid(evt, beat, strict) {
      var container = evt.target;
      while (!container.classList.contains('drums-beat')) {
        container = container.parentElement;
      }
      var box = container.getBoundingClientRect();
      var x = evt.clientX - box.left;
      var y = evt.clientY - box.top;
      var cellHeight = box.height / workspace.track.instrument.length;
      var cells = beat.grid || beat.subdivision;

      var subbeat = 1 + parseInt(x * cells / box.width);
      var drumIndex = parseInt(y / cellHeight);
      var drum = workspace.track.instrument[drumIndex].name;

      if (strict) {
        var dx = Math.abs(x - (subbeat - 0.5) * (box.width / cells));
        if (dx > cellHeight*0.75*0.5) {
          return;
        }
      }
      return {
        subbeat: subbeat,
        start: (subbeat - 1) / cells,
        drum: drum,
        drumIndex: drumIndex,
        containerElem: container
      };
    }


    function moveLeft (sound) {
      if (sound.start > 0) {
        sound.start = sound.start - 1 / sound.beat.subdivision;
      } else {
        var prevBeat = workspace.trackSection.prevBeat(sound.beat);
        sound.beat.data.splice(sound.beat.data.indexOf(sound), 1);
        sound.start = 1 - 1 /prevBeat.subdivision;
        workspace.trackSection.addSound(prevBeat, sound);
      }
    }

    function moveRight(sound) {
      var step = 1 / sound.beat.subdivision;
      sound.start += step;
      if (sound.start >= 1) {
        sound.start -= 1;
        sound.beat.data.splice(sound.beat.data.indexOf(sound), 1);
        workspace.trackSection.addSound(workspace.trackSection.nextBeat(sound.beat), sound);
      }
    }

    function moveUp(sound) {
      var index = workspace.trackSection.instrument.index[sound.drum];
      if (index > 0) {
      index -= 1;
        workspace.trackSection.deleteSound(sound);
        sound.drum = workspace.trackSection.instrument[index].name;
        workspace.trackSection.addSound(sound.beat, sound);
      }
    }

    function moveDown(sound) {
      var index = workspace.trackSection.instrument.index[sound.drum];
      index++;
      if (index < workspace.trackSection.instrument.length) {
        sound.drum = workspace.trackSection.instrument[index].name;
      }
    }

    return {
      selector: selector,
      click(evt, beat) {
        var grid = getSoundGrid(evt, beat, true);
        if (!grid) return;

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
      volumeScroll(evt, beat, step) {
        var grid = getSoundGrid(evt.originalEvent, beat, true);
        if (!grid) return;

        var sound = workspace.trackSection.sound(beat, {start: grid.start, drum: grid.drum});
        if (!sound && step > 0) {
          sound = {
            start: grid.start,
            drum: grid.drum,
            volume: 0
          }
          workspace.trackSection.addSound(beat, sound);
        }
        if (sound) {
          sound.volume += step;
          if (sound.volume < 0.05) {
            workspace.trackSection.deleteSound(sound);
          } else if (sound.volume > 1) {
            sound.volume = 1;
          }
        }
      },

      onDragOver(evt, beat) {
        var grid = getSoundGrid(evt, beat);

        var beatBox = grid.containerElem.getBoundingClientRect();
        var cellHeight = beatBox.height / workspace.track.instrument.length;

        var subbeatWidth = beatBox.width / (beat.grid||beat.subdivision);
        var offset = subbeatWidth / 2 -17/(window.scale||1);

        dropBox.setPxStyles({
          left: beatBox.left + (grid.subbeat - 1) * subbeatWidth + offset,
          top: beatBox.top + grid.drumIndex * cellHeight + 7
        });
        // dropBox.elem.style.transform = 'translate('+beatBox.left+'px,'+beatBox.top+'px)';
      },
      onDragEnter(evt, beat) {
        // dropBox.elem.style.opacity = 1;
      },
      onDragLeave(evt, beat) {
        // dropBox.elem.style.opacity = 0;
      },
      onDrop(evt, beat) {
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
      },
      keyPressed(evt) {
        switch (evt.keyCode) {
          case 46: // Del
            selector.all.forEach(workspace.trackSection.deleteSound, workspace.trackSection);
            selector.clearSelection();
            break;
            case 37: // left
              selector.all.forEach(moveLeft);
              evt.preventDefault();
              break;
            case 39: // right
              selector.all.forEach(moveRight);
              evt.preventDefault();
              break;
             case 38: // up
              selector.all.forEach(moveUp);
              evt.preventDefault();
              break;
             case 40: // down
              selector.all.forEach(moveDown);
              evt.preventDefault();
              break;
            case 109: // -
              selector.all.forEach(sound => {
                sound.volume = Math.max(0, parseFloat((sound.volume-0.05).toFixed(2)));
              });
              break;
            case 107: // +
              selector.all.forEach(sound => {
                sound.volume = Math.min(1.0, parseFloat((sound.volume+0.05).toFixed(2)));
              });
              break;
            case 65: // a
              if (evt.ctrlKey) {
                const sounds = [];
                workspace.trackSection.forEachSound(s => sounds.push(s));
                selector.selectMultiple(sounds);
                evt.preventDefault();
              }
              break;
        }
      }
    }
  }


  function DrumController($scope, drumEditor) {
    $scope.editor = drumEditor;
  }

})();