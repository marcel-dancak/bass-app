(function() {
  'use strict';

  angular
    .module('bd.app')
    .factory('DragHandler', dragHandler)


  function px(val) {
    return val+'px';
  }

  function dragHandler($mdUtil, workspace, swiperControl, soundAnimation) {
    var dragWidth;
    var soundHandler;
    var workspaceElem;

    function beatGrid(beat) {
      return beat.grid || beat.subdivision;
    }


    function SingleSoundHandler(dragHandler, dragSound) {
      var dragElem;
      var dragBox;
      var dropSound;
      var canDrop = false;
      var dropArea;
      return {
        // createDragSoundElem: function() {},
        onDragStart: function(evt) {
          dragElem = dragHandler.createDragWrapperElement();

          var dragSoundElem;
          if (dragSound.elem) {
            dragSoundElem = dragSound.elem[0].cloneNode(true);
          } else {
            dragSoundElem = document.createElement('div');
            dragSoundElem.className = 'sound-container selected '+(dragSound.note.type || '');
            dragSoundElem.setAttribute('octave', dragSound.note.octave);
            var label = dragSound.note.name || evt.target.textContent;
            dragSoundElem.appendChild(document.createTextNode(label));
          }
          dragSoundElem.style.transform = 'scale3d({0}, {0}, 1)'.format(window.scale || 1);
          dragSoundElem.style.width = evt.target.clientWidth + 'px';
          dragSoundElem.style.height = evt.target.clientHeight + 'px';
          dragElem.appendChild(dragSoundElem);

          workspaceElem.appendChild(dragElem);
          evt.dataTransfer.setDragImage(dragElem, 10, evt.target.clientHeight/2);

          dragBox = angular.element('<div class="drag-box"></div>');
          document.body.appendChild(dragBox[0]);

          if (!evt.ctrlKey && dragSound.elem) {
            setTimeout(function() {
              dragSound.elem.addClass('drag-move-element');
            }, 80);
          }

          dropSound = {
            beat: dragSound.beat,
            note: dragSound.note
          }
        },
        onDragOver: function(dropInfo) {
          canDrop = dragHandler.validateDrop(dragSound, dropInfo.beat, dropInfo.position);
          dropSound.beat = dropInfo.beat;
          var width = workspace.trackSection.soundDuration(dropSound) * dropInfo.beatBounds.width;
          dragBox.css({
            left: px(dropInfo.x),
            top: px(dropInfo.y),
            width: px(width+2),
            height: px(dropInfo.beatBounds.height+2),
            opacity: 1,
            borderColor: canDrop? '' : 'red'
          });
          dropArea = dropInfo;
        },
        onDrop: function(evt) {
          if (!canDrop) return;
          var sound = angular.copy(dragSound);
          sound.start = dropArea.start;
          dragHandler.updateDropSound(sound, dropArea.beat, dropArea.position);

          if (evt.dataTransfer.dropEffect === 'move' && dragSound.elem) {
            soundAnimation(dragSound.elem[0]);
            dragSound.elem.removeClass('drag-move-element');
            workspace.trackSection.deleteSound(dragSound);
          }
          workspace.trackSection.addSound(dropArea.beat, sound);
          return sound;
        },
        onDragEnd: function(evt) {
          if (dragSound.elem) {
            // soundAnimation(dragSound.elem[0]);
            // soundAnimation(evt.target);
            dragSound.elem.removeClass('drag-move-element');
          }
          dragElem.remove();
          dragBox.remove();
        }
      }
    }

    function MultiSoundHandler(dragHandler, dragSound) {
      var dragElem;
      var dragBox;
      var srcDragElems;
      var sounds;
      var dropArea;
      var canDrop;
      return {
        onDragStart: function(evt) {
          var sound = dragSound;
          sounds = [sound];
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

          dragElem = dragHandler.createDragWrapperElement();
          srcDragElems = [];

          var container = document.createDocumentFragment();
          sounds.forEach(function(sound, i) {
            var elem = swiperControl.getSoundElem(sound);
            var clone = elem.cloneNode(true);
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

          var dragElemHeight = srcDragElems[0].offsetHeight;
          dragElem.style.height = dragElemHeight+'px';
          dragElem.style.paddingTop = '32px';

          workspaceElem.appendChild(dragElem);

          evt.dataTransfer.setDragImage(dragElem, 10, 32+dragElemHeight/2);
          setTimeout(function() {
            if (!evt.ctrlKey) {
              srcDragElems.forEach(function(elem) {
                elem.classList.add('drag-move-element');
              });
            }
          });

          dragBox = angular.element('<div class="drag-box"></div>');
          document.body.appendChild(dragBox[0]);
        },
        onDragOver: function(dropInfo) {
          canDrop = true;
          var width = 0;
          var dropSound = {
            beat: dropInfo.beat
          }
          for (var i = 0; i < sounds.length; i++) {
            dropSound.note = sounds[i].note;
            width += workspace.trackSection.soundDuration(dropSound) * dropInfo.beatBounds.width;
            if (!dragHandler.validateDrop(sounds[i], dropInfo.beat, dropInfo.position)) {
              canDrop = false;
            }
          }

          dragBox.css({
            left: px(dropInfo.x),
            top: px(dropInfo.y),
            width: px(width+2),
            height: px(dropInfo.beatBounds.height+2),
            opacity: 1,
            borderColor: canDrop? '' : 'red'
          });
          dropArea = dropInfo;
        },
        onDrop: function(evt) {
          var sound = angular.copy(dragSound);
          var beat = dropArea.beat;
          var start = dropArea.start;

          var createdSounds = [];
          sounds.forEach(function(sound) {
            var newSound = angular.copy(sound);
            newSound.start = start;
            dragHandler.updateDropSound(newSound, beat, dropArea.position);

            workspace.trackSection.addSound(beat, newSound);
            createdSounds.push(newSound);

            var next = workspace.trackSection.nextSoundPosition(newSound);
            beat = next.beat;
            start = next.start;
          });

          if (evt.dataTransfer.dropEffect === "move") {
            workspace.trackSection.deleteSound(sounds[0]);
          }
          return createdSounds[0];
        },
        onDragEnd: function(evt) {
          dragElem.remove();
          dragBox.remove();
          srcDragElems.forEach(function(elem) {
            soundAnimation(elem);
            elem.classList.remove('drag-move-element');
          });
        }
      }
    };

    function ProxySoundsHandler(dragHandler, items) {
      var offsets;
      var dragElem;
      return {
        onDragStart: function(evt) {
          var mainIndex;
          var groupBounds = {x1: 5000, y1: 5000, x2: 0, y2: 0};
          var bounds = items.map((item, index) => {
            var box = item.sound.elem[0].getBoundingClientRect();
            if (evt.clientX > box.left && evt.clientX < box.right && evt.clientY > box.top && evt.clientY < box.bottom) {
              mainIndex = index;
            }
            groupBounds.x1 = Math.min(groupBounds.x1, box.left);
            groupBounds.y1 = Math.min(groupBounds.y1, box.top);
            groupBounds.x2 = Math.max(groupBounds.x2, box.right);
            groupBounds.y2 = Math.max(groupBounds.y2, box.bottom);
            return box;
          });
          // move 'main' sound handler to first index
          items.splice(0, 0, items.splice(mainIndex, 1)[0]);
          bounds.splice(0, 0, bounds.splice(mainIndex, 1)[0]);

          var origin = bounds[0];
          offsets = bounds.map((box, index) => {
            return [box.x - origin.x, box.y - origin.y];
          });

          // items[0].handler.onDragStart(evt);
          evt.dataTransfer._setDragImage = evt.dataTransfer.setDragImage;

          dragElem = document.createElement('DIV');
          dragElem.style.position = 'fixed';
          dragElem.style.width = (groupBounds.x2 - groupBounds.x1) + 'px';
          dragElem.style.height = (groupBounds.y2 - groupBounds.y1) + 'px';
          dragElem.style.top = '-'+dragElem.style.height;
          dragElem.style.backgroundColor = 'rgba(255,255,255,0.01)';

          var container = document.createDocumentFragment();
          
          var elemIndex = 0;
          evt.dataTransfer.setDragImage = function(elem, x, y) {
            // elem.remove();
            elem.style.position = 'absolute';
            elem.style.left = (bounds[elemIndex].left - groupBounds.x1) + 'px';
            elem.style.top = (bounds[elemIndex].top - groupBounds.y1 - y) + 'px';
            // elem.style.bottom = (bounds[elemIndex].top - groupBounds.y1 + bounds[elemIndex].height) + 'px';
            // elem.style.top = 'auto';

            container.appendChild(elem);
            elemIndex++;
          };

          items.forEach((item) => {
            Object.defineProperty(evt, 'target', {writable: true, enumerable: true});
            evt.target = item.sound.elem[0];
            item.handler.onDragStart(evt);
          });

          dragElem.appendChild(container);
          workspaceElem.appendChild(dragElem);
          evt.dataTransfer._setDragImage(dragElem, bounds[0].left-groupBounds.x1+10, bounds[0].top-groupBounds.y1+10);
        },
        onDragOver: function(dropInfo, evt) {
          if (!evt.index) {
            items[0].handler.onDragOver(dropInfo);

            // trigger 'dragover' events on additional drop targets
            // to obtain proper dropInfo params (beat, position, ...)
            items.slice(1).forEach((item, index) => {
              var e = new CustomEvent('dragover');
              var target = angular.element(document.elementFromPoint(
                evt.clientX + offsets[index+1][0],
                evt.clientY + offsets[index+1][1]
              ));
              var dropBounds = target[0].getBoundingClientRect();

              e.clientX = evt.clientX + offsets[index+1][0];
              e.clientY = evt.clientY + offsets[index+1][1];
              e.offsetX = evt.clientX + offsets[index+1][0] - dropBounds.x;
              e.index = index + 1;
              target[0].dispatchEvent(e);
            });
          } else {
            // delegate proper dragOver event to sound handler
            items[evt.index].handler.onDragOver(dropInfo);
          }
        },
        onDrop: function(evt) {
          items.forEach((item) => {
            item.handler.onDrop(evt);
          });
        },
        onDragEnd: function(evt) {
          items.forEach((item) => {
            item.handler.onDragEnd(evt);
          });
          dragElem.remove();
          console.log(dragElem);
        }
      }
    };

    var registredHandlers = {}

    class DragHandler {
      constructor(type) {
        this.type = type;
        this.lastDragOver = {};
        registredHandlers[type] = this;
      }

      createDragWrapperElement() {
        var dragElem = document.createElement('div');
        dragElem.className = 'drag-sound '+this.type;
        return dragElem;
      }

      selectSoundHandler(channel, sound) {
        if (channel === 'instrument') {
          return SingleSoundHandler(this, sound);
        }
        if (channel === 'editor') {
          var isMultiSound = sound.next || sound.prev;
          return isMultiSound? MultiSoundHandler(this, sound) : SingleSoundHandler(this, sound);
        }
      }

      onDragStart(evt, sound) {}
      onDragEnd(evt, sound) {}


      onDragOver(evt, beat, position) {
        console.log('onDragOver');
        var grid = beatGrid(beat);
        var cell = evt.target.offsetWidth / grid;
        // var x = parseInt(evt.offsetX / cell); // doesn't work in FF
        var x = parseInt((evt.clientX - evt.target.getBoundingClientRect().left) / cell);
        var start = x / grid;
        var key = JSON.stringify({
          bar: beat.bar,
          beat: beat.beat,
          y: position,
          x: x
        });
        if (this.lastDragOverKey !== key) {
          var box = evt.target.getBoundingClientRect();

          soundHandler.onDragOver({
            beatBounds: box,
            beat: beat,
            position: position,
            start: start,
            x: box.left + x * cell,
            y: box.top - 1
          }, evt);
        }
        this.lastDragOverKey = key;
      }

      onDrop(evt) {
        var sound = soundHandler.onDrop(evt);
      }
    }

    DragHandler.initialize = function(selector, scope) {
      workspaceElem = document.querySelector(selector);

      var dragData;
      var dragHandler;
      scope.$on('ANGULAR_DRAG_START', function(evt, e, channel, data) {
        console.log('ANGULAR_DRAG_START');
        console.log(data.data.length)
        var channelParts = channel.split('.');
        var _this = registredHandlers[channelParts[0]];
        if (_this) {
          if (data.data.length > 1) {
            var handlers = [];
            data.data.forEach((sound) => {
              var handler = _this.selectSoundHandler(channelParts[1], sound);
              handlers.push({
                sound,
                handler
              });
            });
            soundHandler = ProxySoundsHandler(_this, handlers);
          } else {
            if (data.data.length === 1) {
              data.data = data.data[0];
            }
            soundHandler = _this.selectSoundHandler(channelParts[1], data.data);
          }
          dragData = data.data;
          dragHandler = _this;
          if (soundHandler) {
            _this.dragChannel = channelParts[1];
            _this.onDragStart(e, dragData);
            soundHandler.onDragStart(e);
          }
        }
      });

      scope.$on('ANGULAR_DRAG_END', function(evt, e, channel, data) {
        console.log('ANGULAR_DRAG_END');
        if (soundHandler) {
          soundHandler.onDragEnd(e, dragData);
          dragHandler.onDragEnd(e, dragData);
          soundHandler = null;
        }
      });

      scope.$on('$destroy', function() {
        workspaceElem = null;
      });
    }
    return DragHandler;
  }

})();