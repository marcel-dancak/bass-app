(function() {
  'use strict';

  angular
    .module('bd.app')

    .factory('eventHandler', eventHandler)
    .factory('dragHandler2', dragHandler2)
    .factory('resizeHandler2', resizeHandler2)
    .controller('EditController', EditController);


  /***************** Private helper functions ******************/


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

  function eventHandler(workspace, Notes) {
    return {
      selected: {},
      select: function(evt, sound) {
        console.log('selectSound');
        if (this.selected.element) {
          this.selected.element.classList.remove('selected');
        }
        var elem = soundContainerElem(evt.target);
        elem.classList.add('selected');
        this.selected.element = elem;
        this.selected.sound = sound;
      },
      keyPressed: function(evt) {
        var sound = this.selected.sound;
        console.log(evt.keyCode)
        if (sound) {
          switch (evt.keyCode) {
            case 46: // Del
              workspace.trackSection.deleteSound(sound);
              break;
            case 74: // j
              console.log(JSON.stringify(sound));
              var prevSound = workspace.trackSection.prevSound(sound);
              if (prevSound) {
                sound.prev = true;
                prevSound.next = true;
              }
              break;
            case 9: // Tab
              if (sound.note.name.endsWith('♯')) {
                sound.note.name = Notes.toFlat(sound.note.name);
              } else if (sound.note.name.endsWith('♭')) {
                sound.note.name = Notes.toSharp(sound.note.name);
              }
              evt.preventDefault();
              return false;
            case 190: // .
              sound.note.staccato = !sound.note.staccato;
              break;
            case 109: // -
              sound.volume -= 0.1;
              console.log(sound.volume);
              break;
            case 107: // +
              sound.volume += 0.1;
              console.log(sound.volume);
              break;

            // just for debugging
            case 78: // n
              var n = workspace.trackSection.nextSound(sound)
              console.log(n)
              break;
            case 80: // p
              var prev = workspace.trackSection.prevSound(sound);
              if (prev) {
                console.log('OK');
              }
              break;
          }
        }
      }
    }
  }

  function dragHandler2(workspace, swiperControl) {
    var dragSound;
    var dragWidth;
    var dragHandler;

    document.body.appendChild(dragBox.elem);

    var scope = angular.element(document.body).scope();
    scope.$on('ANGULAR_DRAG_START', function(evt, e, channel, data) {
      if (channel === 'piano' || channel === 'keyboard') {
        dragSound = data.data;
        var isMultiSound = dragSound.next || dragSound.prev;
        if (channel === 'keyboard') {
          dragHandler = keyboardSoundHandler;
        } else {
          dragHandler = isMultiSound? multiSoundHandler : singleSoundHandler;
        }
        dragHandler.onDragStart(e, dragSound);
        dragBox.elem.style.opacity = 1;
      }
    });
    scope.$on('ANGULAR_DRAG_END', function(evt, e, channel, data) {
      if (channel === 'piano' || channel === 'keyboard') {
        dragBox.elem.style.opacity = 0;
        dragHandler.onDragEnd(e);
      }
    });

    function soundElement(sound) {
      var beatSelector = '#beat_{0}_{1} .sounds-container'.format(sound.beat.bar, sound.beat.beat);
      var contEl = swiperControl.instrumentSwiper.wrapper[0].querySelector(beatSelector);
      var index = sound.beat.data.indexOf(sound);
      if (index !== -1) {
        return contEl.children[index+1];
      }
    }


    var keyboardSoundHandler = {
      dragElem: null,
      onDragStart: function(evt, dragSound) {
        dragWidth = evt.target.clientWidth+2;
        var dragElem = document.createElement('div');
        dragElem.className = 'piano drag-group';
        dragElem.style.width = evt.target.clientWidth+'px';
        var noteElem = document.createElement('div');
        noteElem.className = 'sound-container';
        noteElem.setAttribute('octave', dragSound.note.octave);
        noteElem.appendChild(document.createTextNode(dragSound.note.name));
        dragElem.appendChild(noteElem);

        document.body.appendChild(dragElem);
        evt.dataTransfer.setDragImage(dragElem, 10, 36);
        this.dragElem = dragElem;
      },
      canDrop: function(key, sound) {
        // var piano = workspace.trackSection.instrument;
        // return piano.stringIndex(note) === piano.stringIndex(dragSound.note);
        return key.octave === sound.note.octave && key.label[0] === sound.note.name;
      },
      onDrop: function(evt, beat, note, dragSound) {
        this.dragElem.remove();
        var box = evt.target.getBoundingClientRect();
        var grid = evt.target.offsetWidth / beat.subdivision;
        var sound = angular.copy(dragSound);
        sound.start = parseInt(evt.offsetX / grid) / beat.subdivision;
        sound.string = dragSound.note.name+dragSound.note.octave;
        workspace.trackSection.addSound(beat, sound);
      },
      onDragEnd: angular.noop
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
      canDrop: function(key, sound) {
        return true;
      },
      onDrop: function(evt, beat, note, dragSound) {
        var box = evt.target.getBoundingClientRect();
        var grid = evt.target.offsetWidth / beat.subdivision;
        var sound = angular.copy(dragSound);
        sound.start = parseInt(evt.offsetX / grid) / beat.subdivision;
        sound.string = note.label[0]+note.octave;
        sound.note.name = note.label[0];
        sound.note.octave = note.octave;

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
        var dragElem = angular.element('<div class="piano drag-group"></div>')[0];
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
        document.body.appendChild(dragElem);
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
      canDrop: function(key, sound) {
        return true;
      },
      onDrop: function(evt, beat, note, dragSound) {
        var box = evt.target.getBoundingClientRect();
        var grid = evt.target.offsetWidth / beat.subdivision;
        var sound = angular.copy(dragSound);
        var start = parseInt(evt.offsetX / grid) / beat.subdivision;

        this.sounds.forEach(function(sound) {
          var newSound = angular.copy(sound);
          newSound.start = start;
          newSound.string = note.label[0]+note.octave;
          newSound.note.name = note.label[0];
          newSound.note.octave = note.octave;
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
    return {
      canDrop: false,
      onDragEnter: function(evt, beat, note) {
        this.canDrop = dragHandler.canDrop(note, dragSound);
        dragBox.elem.style.borderColor = this.canDrop? '' : 'red';
      },
      onDragLeave: function(evt, beat, note) {},
      onDragOver: function(evt, beat, note) {
        // console.log('onDragOver');
        var box = evt.target.getBoundingClientRect();
        var grid = evt.target.offsetWidth / beat.subdivision;
        var x = parseInt(evt.offsetX / grid);
        dragBox.setPxStyles({
          left: box.left + x * grid,
          top: box.top-1,
          width: dragWidth,
          height: box.height
        });
      },
      onDrop: function(evt, beat, note) {
        if (this.canDrop) {
          dragHandler.onDrop(evt, beat, note, dragSound);
        }
      }
    }
  }

  function resizeHandler2($timeout, workspace, swiperControl, eventHandler, Note) {

    var resizeBox = {
      elem: angular.element('<div class="resize-box"><i></i></div>')[0],
      setSymbol: function(symbol, dotted) {
        var labelElem = this.elem.children[0];
        labelElem.className = symbol;
        labelElem.innerHTML = dotted? '.' : '';
      },
      setPxStyles: function(styles) {
        for (var key in styles) {
          this.elem.style[key] = styles[key]+'px';
        }
      }
    };

    var noteLengthSymbols = {};
    for (name in Note) {
      var note = Note[name];
      noteLengthSymbols[1.0/note.value] = note.symbol;
    }

    var noteLengths = [
      {
        length: 1,
        dotted: false
      }, {
        length: 1,
        dotted: true
      }, {
        length: 2,
        dotted: false
      }, {
        length: 2,
        dotted: true
      }, {
        length: 4,
        dotted: false
      }, {
        length: 4,
        dotted: true
      }, {
        length: 8,
        dotted: false
      }, {
        length: 8,
        dotted: true
      }, {
        length: 16,
        dotted: false
      }, {
        length: 16,
        dotted: true
      }
    ];

    var notesWidths;
    var resizeLength;

    return {
      resizeSound: function(sound, length, dotted) {
        var dependencies = [];

        // collect next sounds
        var s = sound;
        while (s.next) {
          s = workspace.trackSection.nextSound(s);
          dependencies.push(s);
        }
        sound.note.length = resizeLength.length;
        sound.note.dotted = resizeLength.dotted;

        var duration = workspace.trackSection.soundDuration(sound);
        sound.end = sound.start + duration;

        var prevSound = sound;
        dependencies.forEach(function(depSound) {
          var position = workspace.trackSection.nextSoundPosition(prevSound);
          depSound.start = position.start;
          if (position.beat !== depSound.beat) {
            // console.log('moving to '+position.beat.beat+ ' at: '+position.start);
            depSound.beat.data.splice(depSound.beat.data.indexOf(depSound), 1);
            workspace.trackSection.addSound(position.beat, depSound);
          } else {
            // console.log('moving to position '+position.start)
            depSound.end = depSound.start + workspace.trackSection.soundDuration(depSound);
          }
          prevSound = depSound;
        });
      },
      onResizeStart: function(sound, info) {
        eventHandler.select({target: info.element[0]}, sound);
        var beatWidth = swiperControl.instrumentSwiper.slides[swiperControl.instrumentSwiper.snapIndex].clientWidth;

        notesWidths = noteLengths.map(function(noteLength) {
          var length = 1 / (noteLength.dotted? noteLength.length * 0.667 : noteLength.length);
          var width = length * workspace.section.timeSignature.bottom * beatWidth;
          return width;
        });

        this.onResize(sound, info);
        // resizeBox.elem.style.opacity = '1';
        resizeBox.setPxStyles({height: eventHandler.selected.element.offsetHeight});
        eventHandler.selected.element.appendChild(resizeBox.elem);
      },

      onResize: function(sound, info) {
        var delta, closestWidth;
        var minDelta = notesWidths[0];
        notesWidths.forEach(function(width, index) {
          delta = Math.abs(info.width - width);
          if (delta < minDelta) {
            closestWidth = width;
            minDelta = delta;
            resizeLength = noteLengths[index];
          }
        });
        resizeBox.setPxStyles({width: closestWidth});
        var symbol = noteLengthSymbols[resizeLength.length];
        resizeBox.setSymbol(symbol, resizeLength.dotted);
      },

      onResizeEnd: function(sound, info, evt) {
        info.element.css('width', '');
        resizeBox.elem.remove();

        this.resizeSound(sound, resizeLength.length, resizeLength.dotted);
        evt.stopPropagation();
      }
    }
  }

  function EditController($scope, eventHandler, dragHandler2, resizeHandler2) {
    $scope.dragHandler = dragHandler2;
    $scope.eventHandler = eventHandler;
    $scope.resizeHandler = resizeHandler2;
  }

})();