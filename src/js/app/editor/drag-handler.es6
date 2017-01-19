(function() {
  'use strict';

  angular
    .module('bd.app')
    .factory('DragHandler', dragHandler)


  function soundContainerElem(elem) {
    var e = elem;
    var maxDepth = 10;
    while (e.className.indexOf("sound-container") === -1) {
      //console.log(e.className);
      e = e.parentElement;
      if (maxDepth-- === 0) {
        return null;
      };
    }
    return e;
  }

  var dragBox = {
    elem: angular.element('<div class="drag-box"></div>')[0],
    setPxStyles: function(styles) {
      // Object.keys(styles).forEach(function(key))
      for (var key in styles) {
        this.elem.style[key] = styles[key]+'px';
      }
    }
  };

  function dragHandler(workspace, swiperControl) {
    var dragSound;
    var dragWidth;
    var dragHandler;

    var workspaceElem = document.querySelector('.instrument-grid');
    document.body.appendChild(dragBox.elem);

    var instrumentSoundHandler = {
      dragElem: null,
      onDragStart: function(evt, dragSound) {
        dragWidth = evt.target.clientWidth+2;
        var dragElem = document.createElement('div');
        dragElem.className = 'drag-group';
        dragElem.style.width = evt.target.clientWidth+'px';
        var noteElem = document.createElement('div');
        noteElem.className = 'sound-container';
        noteElem.setAttribute('octave', dragSound.note.octave);
        noteElem.appendChild(document.createTextNode(dragSound.note.name));
        dragElem.appendChild(noteElem);

        workspaceElem.appendChild(dragElem);
        evt.dataTransfer.setDragImage(dragElem, 10, 36);
        this.dragElem = dragElem;
      },
      onDrop: function(evt, mainHandler, dragSound, beat, position) {
        var box = evt.target.getBoundingClientRect();
        var grid = evt.target.offsetWidth / beat.subdivision;
        var sound = angular.copy(dragSound);
        mainHandler.updateDropSound(sound, beat, position);
        sound.start = parseInt(evt.offsetX / grid) / beat.subdivision;
        workspace.trackSection.addSound(beat, sound);
      },
      onDragEnd: function() {
        this.dragElem.remove();
      }
    };

    var singleSoundHandler = {
      onDragStart: function(evt, dragSound) {
        dragWidth = evt.target.clientWidth+2;
        evt.dataTransfer.setDragImage(evt.target, 10, 7);
        if (!evt.ctrlKey) {
          setTimeout(function() {
            evt.target.classList.add('drag-move-element');
          }, 80);
        }
      },
      onDrop: function(evt, mainHandler, dragSound, beat, position) {
        var box = evt.target.getBoundingClientRect();
        var grid = evt.target.offsetWidth / beat.subdivision;
        var sound = angular.copy(dragSound);
        sound.start = parseInt(evt.offsetX / grid) / beat.subdivision;

        mainHandler.updateDropSound(sound, beat, position);

        if (evt.dataTransfer.dropEffect === 'move') {
          workspace.trackSection.deleteSound(dragSound);
        }
        workspace.trackSection.addSound(beat, sound);
      },
      onDragEnd: function(evt) {
        if (evt.target) {
          evt.target.classList.remove('drag-move-element');
        }
      },
    };

    function soundElement(sound) {
      var beatSelector = '#beat_{0}_{1} .sounds-container'.format(sound.beat.bar, sound.beat.beat);
      var contEl = swiperControl.instrumentSwiper.wrapper[0].querySelector(beatSelector);
      var index = sound.beat.data.indexOf(sound);
      // console.log(index+'/'+contEl.childElementCount)
      if (index !== -1) {
        return contEl.children[index+1].querySelector('.sound-container');
      }
    }

    var multiSoundHandler = {
      onDragStart: function(evt, dragSound) {
        var sound = dragSound;
        var sounds = [sound];
        while (sound.prev) {
          sound = workspace.trackSection.prevSound(sound);
          if (sound) {
            sounds.splice(0, 0, sound);
          } else {
            console.log('ERROR');
            return;
          }
        }
        sound = dragSound;
        while (sound.next) {
          sound = workspace.trackSection.nextSound(sound);
          if (sound) {
            sounds.push(sound);
          } else {
            console.log('ERROR');
            return;
          }
        }

        var srcDragElems = [];
        dragWidth = 0;
        var dragElem = angular.element('<div class="drag-group"></div>')[0];
        sounds.forEach(function(sound) {
          var elem = soundElement(sound);
          var clone = elem.cloneNode(true);
          dragWidth += elem.clientWidth + 2;
          clone.style.width = elem.clientWidth+'px';
          clone.style.position = 'relative';
          clone.style.display = 'inline-block';
          dragElem.appendChild(clone);
          srcDragElems.push(elem);
        });
        this.srcDragElems = srcDragElems;

        workspaceElem.appendChild(dragElem);

        evt.dataTransfer.setDragImage(dragElem, 10, 36);
        this.sounds = sounds;
        this.dragElem = dragElem;
        setTimeout(function() {
          if (!evt.ctrlKey) {
            srcDragElems.forEach(function(elem) {
              elem.classList.add('drag-move-element');
            });
          }
        });
      },
      onDrop: function(evt, mainHandler, dragSound, beat, position) {
        var box = evt.target.getBoundingClientRect();
        var grid = evt.target.offsetWidth / beat.subdivision;
        var sound = angular.copy(dragSound);
        var start = parseInt(evt.offsetX / grid) / beat.subdivision;

        this.sounds.forEach(function(sound) {
          var newSound = angular.copy(sound);
          newSound.start = start;
          mainHandler.updateDropSound(newSound, beat, position);

          workspace.trackSection.addSound(beat, newSound);

          var next = workspace.trackSection.nextSoundPosition(newSound);
          beat = next.beat;
          start = next.start;
        });

        if (evt.dataTransfer.dropEffect === "move") {
          workspace.trackSection.deleteSound(this.sounds[0]);
        }
      },
      onDragEnd: function(evt) {
        this.dragElem.remove();
        this.srcDragElems.forEach(function(elem) {
          elem.classList.remove('drag-move-element');
        });
      },
    };

    class DragHandler {
      constructor() {
        this.dragBox = dragBox;

        var _this = this;
        var scope = angular.element(document.body).scope();
        scope.$on('ANGULAR_DRAG_START', function(evt, e, channel, data) {
          console.log('ANGULAR_DRAG_START');
          // console.log(data.data)
          dragHandler = _this.selectDragHandler(channel, data.data);
          if (dragHandler) {
            dragSound = data.data;
            _this.dragSound = dragSound;
            _this.dragChannel = channel;
            dragHandler.onDragStart(e, dragSound);
            dragBox.elem.style.opacity = 1;
          }
        });
        scope.$on('ANGULAR_DRAG_END', function(evt, e, channel, data) {
          console.log('ANGULAR_DRAG_END');
          if (dragHandler) {
            dragBox.elem.style.opacity = 0;
            dragHandler.onDragEnd(e);
          }
        });
      }

      selectDragHandler(channel, sound) {
        console.log('selectDragHandler')
        if (channel === 'instrument') {
          return instrumentSoundHandler;
        }
        if (channel === 'editor') {
          var isMultiSound = sound.next || sound.prev;
          return isMultiSound? multiSoundHandler : singleSoundHandler;
        }
      }

      onDragOver(evt, beat, note) {
        console.log('onDragOver');
        var box = evt.target.getBoundingClientRect();
        var grid = evt.target.offsetWidth / beat.subdivision;
        var x = parseInt(evt.offsetX / grid);
        dragBox.setPxStyles({
          left: box.left + x * grid,
          top: box.top-1,
          width: dragWidth,
          height: box.height
        });
      }

      onDrop(evt, beat, position) {
        if (!this.canDrop) return;
        dragHandler.onDrop(evt, this, dragSound, beat, position);
        dragHandler = null;
      }
    }
    return DragHandler;
  }

})();