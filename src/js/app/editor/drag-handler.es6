(function() {
  'use strict';

  angular
    .module('bd.app')
    .factory('DragHandler', dragHandler)



  var dragBox = {
    elem: angular.element('<div class="drag-box"></div>')[0],
    setPxStyles: function(styles) {
      // Object.keys(styles).forEach(function(key))
      for (var key in styles) {
        this.elem.style[key] = styles[key]+'px';
      }
    }
  };

  function dragHandler($mdUtil, workspace, swiperControl) {
    var dragSound;
    var dragWidth;
    var dragHandler;

    var workspaceElem;
    // var workspaceElem = document.querySelector('.instrument-grid');
    document.body.appendChild(dragBox.elem);

    function beatGrid(beat) {
      return beat.grid || beat.subdivision;
    }

    var instrumentSoundHandler = {
      dragElem: null,
      onDragStart: function(evt, dragSound) {
        dragWidth = evt.target.clientWidth+2;

        var dragElem = this.mainHandler.createDragWrapperElement();

        var noteElem = document.createElement('div');
        noteElem.className = 'sound-container selected '+(dragSound.note.type || '');
        noteElem.style.transform = 'scale3d({0}, {0}, 1)'.format(window.scale || 1);
        noteElem.style.width = evt.target.clientWidth + 'px';
        noteElem.style.height = evt.target.clientHeight + 'px';
        noteElem.setAttribute('octave', dragSound.note.octave);
        var label = dragSound.note.name || evt.target.textContent;
        noteElem.appendChild(document.createTextNode(label));
        dragElem.appendChild(noteElem);

        workspaceElem.appendChild(dragElem);
        evt.dataTransfer.setDragImage(dragElem, 10, evt.target.clientHeight/2);
        this.dragElem = dragElem;
      },
      onDrop: function(evt, mainHandler, dragSound, beat, position) {
        var box = evt.target.getBoundingClientRect();
        var cell = evt.target.offsetWidth / beatGrid(beat);
        var sound = angular.copy(dragSound);
        mainHandler.updateDropSound(sound, beat, position);
        sound.start = parseInt(evt.offsetX / cell) / beatGrid(beat);
        workspace.trackSection.addSound(beat, sound);
        return sound;
      },
      onDragEnd: function() {
        this.dragElem.remove();
      }
    };

    var singleSoundHandler = {
      onDragStart: function(evt, dragSound) {
        dragWidth = evt.target.clientWidth+2;
        var dragElem = this.mainHandler.createDragWrapperElement();
        var clone = evt.target.cloneNode(true);

        clone.style.transform = 'scale3d({0}, {0}, 1)'.format(window.scale || 1);
        clone.style.width = evt.target.offsetWidth + 'px';
        clone.style.height = evt.target.offsetHeight + 'px';
        dragElem.appendChild(clone);
        workspaceElem.appendChild(dragElem);
        evt.dataTransfer.setDragImage(dragElem, 10, evt.target.clientHeight/2);

        this.dragElem = dragElem;
        if (!evt.ctrlKey) {
          setTimeout(function() {
            evt.target.classList.add('drag-move-element');
          }, 80);
        }
      },
      onDrop: function(evt, mainHandler, dragSound, beat, position) {
        var box = evt.target.getBoundingClientRect();
        var cell = evt.target.offsetWidth / beatGrid(beat);
        var sound = angular.copy(dragSound);
        sound.start = parseInt(evt.offsetX / cell) / beatGrid(beat);

        mainHandler.updateDropSound(sound, beat, position);

        if (evt.dataTransfer.dropEffect === 'move') {
          workspace.trackSection.deleteSound(dragSound);
        }
        workspace.trackSection.addSound(beat, sound);
        return sound;
      },
      onDragEnd: function(evt) {
        if (evt.target) {
          evt.target.classList.remove('drag-move-element');
        }
        this.dragElem.remove();
      },
    };

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

        var dragElem = this.mainHandler.createDragWrapperElement();
        var srcDragElems = [];
        dragWidth = 0;

        var container = document.createDocumentFragment();
        sounds.forEach(function(sound, i) {
          var elem = swiperControl.getSoundElem(sound);
          var clone = elem.cloneNode(true);
          dragWidth += elem.clientWidth + 2;
          clone.style.width = elem.offsetWidth + 'px';
          clone.style.height = elem.offsetHeight + 'px';
          clone.style.transform = 'none';
          container.appendChild(clone);
          srcDragElems.push(elem);
        });
        if (window.scale && window.scale !== 1) {
          var wrapper = document.createElement('div');
          wrapper.style.display = 'flex';
          wrapper.style.transform = 'scale3d({0}, {0}, 1)'.format(window.scale);
          wrapper.appendChild(container);
          container = wrapper;
        }
        dragElem.appendChild(container);
        this.srcDragElems = srcDragElems;

        var dragElemHeight = srcDragElems[0].offsetHeight;
        dragElem.style.height = dragElemHeight+'px';
        dragElem.style.paddingTop = '32px';

        workspaceElem.appendChild(dragElem);

        evt.dataTransfer.setDragImage(dragElem, 10, 32+dragElemHeight/2);
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
        var cell = evt.target.offsetWidth / beatGrid(beat);
        var sound = angular.copy(dragSound);
        var start = parseInt(evt.offsetX / cell) / beatGrid(beat);

        var createdSounds = [];
        this.sounds.forEach(function(sound) {
          var newSound = angular.copy(sound);
          newSound.start = start;
          mainHandler.updateDropSound(newSound, beat, position);

          workspace.trackSection.addSound(beat, newSound);
          createdSounds.push(newSound);

          var next = workspace.trackSection.nextSoundPosition(newSound);
          beat = next.beat;
          start = next.start;
        });

        if (evt.dataTransfer.dropEffect === "move") {
          workspace.trackSection.deleteSound(this.sounds[0]);
        }
        return createdSounds[0];
      },
      onDragEnd: function(evt) {
        // this.dragElem.remove();
        this.srcDragElems.forEach(function(elem) {
          elem.classList.remove('drag-move-element');
        });
      },
    };

    var registredHandlers = {}

    class DragHandler {
      constructor(type) {
        this.dragBox = dragBox;
        this.type = type;
        registredHandlers[type] = this;
      }

      createDragWrapperElement() {
        var dragElem = document.createElement('div');
        dragElem.className = 'drag-sound '+this.type;
        return dragElem;
      }

      selectDragHandler(channel, sound) {
        if (channel === 'instrument') {
          return instrumentSoundHandler;
        }
        if (channel === 'editor') {
          var isMultiSound = sound.next || sound.prev;
          return isMultiSound? multiSoundHandler : singleSoundHandler;
        }
      }

      onDragStart(evt) {}
      onDragEnd(evt, sound) {}

      onDragEnter(evt, beat, position) {
        // console.log('onDragEnter')
        this.canDrop = this.validateDrop(beat, position);
        this.dragBox.elem.style.borderColor = this.canDrop? '' : 'red';
        if (!this.dragSound.prev && !this.dragSound.next) {
          var beatWidth = evt.target.clientWidth;
          var tmpSound = {
            beat: beat,
            note: dragSound.note
          }
          dragWidth = workspace.trackSection.soundDuration(tmpSound) * beatWidth;
        }
      }

      onDragOver(evt, beat, position) {
        // console.log('onDragOver');
        var box = evt.target.getBoundingClientRect();
        var cell = evt.target.offsetWidth / beatGrid(beat);
        var x = parseInt(evt.offsetX / cell);

        dragBox.setPxStyles({
          left: box.left + x * cell,
          top: box.top - 1,
          width: dragWidth + 2,
          height: box.height + 2
        });
      }

      onDrop(evt, beat, position) {
        if (!this.canDrop) return;
        var sound = dragHandler.onDrop(evt, this, dragSound, beat, position);
        dragHandler = null;
        $mdUtil.nextTick(function() {
          this.onDragEnd({target: swiperControl.getSoundElem(sound)}, sound);
        }.bind(this));
      }
    }

    DragHandler.initialize = function(selector, scope) {
      workspaceElem = document.querySelector(selector);
      scope.$on('ANGULAR_DRAG_START', function(evt, e, channel, data) {
        console.log('ANGULAR_DRAG_START');
        // console.log(data.data)
        var channelParts = channel.split('.');
        var _this = registredHandlers[channelParts[0]];
        if (_this) {
          dragHandler = _this.selectDragHandler(channelParts[1], data.data);
          if (dragHandler) {
            dragHandler.mainHandler = _this;
            dragSound = data.data;
            _this.dragSound = dragSound;
            _this.dragChannel = channelParts[1];
            _this.onDragStart(e);
            dragHandler.onDragStart(e, dragSound);
            dragBox.elem.style.opacity = 1;
          }
        }
      });

      scope.$on('ANGULAR_DRAG_END', function(evt, e, channel, data) {
        console.log('ANGULAR_DRAG_END');
        if (dragHandler) {
          dragBox.elem.style.opacity = 0;
          dragHandler.onDragEnd(e);
        }
      });

      scope.$on('$destroy', function() {
        workspaceElem = null;
      });
    }
    return DragHandler;
  }

})();