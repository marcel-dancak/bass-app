(function() {
  'use strict';

  angular
    .module('bd.app')
    .factory('dragHandler', dragHandler)
    .factory('resizeHandler', resizeHandler)
    .factory('basicHandler', basicHandler);


  /***************** Private helper functions ******************/

  function findRootContainer(elem) {
    var e = elem;
    var maxDepth = 10;
    while (e.className.indexOf("bass-subbeat") === -1) {
      //console.log(e.className);
      e = e.parentElement;
      if (maxDepth-- === 0) {
        return null;
      };
    }
    return e;
  }

  function getGridInfo(coords) {
    var id = "bass_{0}_{1}_{2}_{3}".format(
      coords.bar,
      coords.beat,
      coords.subbeat,
      coords.string
    );
    console.log(id);
    var elem = document.getElementById(id);
    if (elem) {
      return {
        grid: angular.element(elem).scope().grid,
        gridElement: elem.querySelector('.bass-grid'),
        soundElement: elem.querySelector('.bass-sound-container')
      };
    }
  }

  // TODO: fix crash on last grid
  function rightGrid(workspace, grid) {
    var timeSignature = workspace.section.timeSignature;
    var bar = grid.bar;
    var beat = grid.beat;
    var subbeat = grid.subbeat;
    var noteBeatLength = grid.sound.noteLength.beatLength*timeSignature.bottom;

    var bassBeat = workspace.trackSection.beat(bar, beat);
    var subbeatLength = 1 / bassBeat.subdivision;
    if (bassBeat.subdivision === 3) {
      subbeatLength = subbeatLength * (3/2);
    }

    while (noteBeatLength > 0) {
      subbeat++;
      if (subbeat > bassBeat.subdivision) {
        subbeat = 1;
        beat++;
        if (beat > timeSignature.top) {
          beat = 1;
          bar++;
        }
      }
      noteBeatLength-=subbeatLength;
    }
    console.log(grid.string);
    return getGridInfo({
      bar: bar,
      beat: beat,
      subbeat: subbeat,
      string: grid.string.label
    }).grid;
  }

  function connectGrids(grid1, grid2) {
    grid1.sound.next = {
      bar: grid2.bar,
      beat: grid2.beat,
      subbeat: grid2.subbeat,
      string: grid2.string
    };
    Object.defineProperty(grid1.sound.next, 'ref', {value: 'static', writable: true});
    grid1.sound.next.ref = grid2.sound;

    grid2.sound.prev = {
      bar: grid1.bar,
      beat: grid1.beat,
      subbeat: grid1.subbeat,
      string: grid1.string
    };
    Object.defineProperty(grid2.sound.prev, 'ref', {value: 'static', writable: true});
    grid2.sound.prev.ref = grid1.sound;
  }


  var dropArea = {
    elem: angular.element('<div class="drop-area"><label></label></div>')[0],
    setLabel: function(label) {
      this.elem.children[0].innerHTML = label;
    },
    setPxStyles: function(styles) {
      // Object.keys(styles).forEach(function(key))
      for (var key in styles) {
        this.elem.style[key] = styles[key]+'px';
      }
    }
  };

  function dragHandler($timeout, workspace, audioPlayer, swiperControl) {

    var dragHandler;
    var dragData;

    function getSoundLength(sound) {
      var length = sound.noteLength.length;
      if (sound.noteLength.dotted) {
        length *= 1.5;
      }
      return workspace.section.timeSignature.bottom * length;
    }

    /****************** Drag Handlers ******************/

    var fretboardDragHandler = {
      onDragStart: function(evt, dragData, channel) {
        var sound = dragData.sound;
        if (sound.note.type !== 'ghost') {
          var elemBox = evt.target.getBoundingClientRect();
          // console.log(evt.clientX);
          // console.log(evt.clientX - elemBox.left);
          if (sound.note.label.length > 1 && evt.clientX > elemBox.left+elemBox.width/2) {
            sound.note.name = sound.note.label[1];
          } else {
            sound.note.name = sound.note.label[0];
          }
          sound.note.code = sound.note.name + sound.note.octave;
        }
        // update transfer data
        var transferDataText = angular.toJson({data: {sound: sound}});
        evt.dataTransfer.setData('text', transferDataText);
        console.log(transferDataText);
      },
      onDragEnd: function(evt) {},
      onDrop: function(evt, data, dropGrid) {
        angular.extend(dropGrid.sound, data.sound);
        dropGrid.sound.string = dropGrid.string;
        dropGrid.sound.noteLength.beatLength = dropGrid.sound.noteLength.length;
        audioPlayer.fetchSoundResources(dropGrid.sound);
      }
    };

    var singleSoundDragHandler = {
      onDragStart: function(evt, dragData, channel) {
        // just align drag element to left-top mouse pointer
        evt.dataTransfer.setDragImage(evt.target, 0, 0);

        if (!evt.ctrlKey) {
          $timeout(function() {
            angular.element(evt.target).addClass("drag-move-element");
          }, 100);
        }
      },
      onDragEnd: function(evt) {
        angular.element(evt.target).removeClass("drag-move-element");
      },
      onDrop: function(evt, dragGrid, dropGrid) {
        angular.extend(dropGrid.sound, dragGrid.sound);
        dropGrid.sound.string = dropGrid.string;

        if (evt.dataTransfer.dropEffect === "move") {
          // var sourceSound = workspaceSection.subbeat(dragGrid.bar, dragGrid.beat, dragGrid.subbeat)[dragGrid.string].sound;
          // $scope.clearSound(sourceSound);
          workspace.trackSection.clearSound(dragData.sound);
        }
      }
    };

    var groupSoundDragHandler = {
      onDragStart: function(evt, dragData, channel) {
        console.log('GROUP Drag Handler');
        var grids = [dragData];
        var soundElements = [evt.target];

        var prev = dragData.sound.prev;
        while (prev) {
          var prevGridData = getGridInfo(prev);
          grids.splice(0, 0, prevGridData.grid);
          soundElements.splice(0, 0, prevGridData.soundElement);
          prev = prevGridData.grid.sound.prev;
        }

        var next = dragData.sound.next;
        while (next) {
          var nextGridData = getGridInfo(next);
          grids.push(nextGridData.grid);
          soundElements.push(nextGridData.soundElement);
          next = nextGridData.grid.sound.next;
        }

        var dragElem = angular.element('<div class="drag-group"></div>');
        // dragElem.addClass($scope.bass.settings.label);
        dragElem = dragElem[0];
        soundElements.forEach(function(elem) {
          var clone = elem.cloneNode(true);
          clone.style.width = elem.clientWidth+'px';
          clone.style.position = 'relative';
          clone.style.display = 'inline-block';
          dragElem.appendChild(clone);
        });
        document.body.appendChild(dragElem);
        evt.dataTransfer.setDragImage(dragElem, 10, 36);
        dropArea.width = dragElem.clientWidth;
        console.log(dragData);
        var beat = workspace.trackSection.beat(dragData.bar, dragData.beat);
        dropArea.subdivision = beat.subdivision;

        this.dragElement = dragElem;
        this.sourceSoundElements = soundElements;
        this.sourceSoundGrids = grids;
        if (!evt.ctrlKey) {
          // set opacity with delay, to avoid opacity in drag image
          setTimeout(function() {
            soundElements.forEach(function(elem) {
              angular.element(elem).addClass("drag-move-element");
            });
          }, 100);
        }
      },
      onDragEnd: function(evt) {
        this.dragElement.remove();
        this.sourceSoundElements.forEach(function(elem) {
          angular.element(elem).removeClass("drag-move-element");
        });
      },
      onDrop: function(evt, dragGrid, dropGrid) {
        // var firstGrid = this.sourceSoundGrids[0];
        // console.log('from: ['+firstGrid.bar+','+firstGrid.beat+','+firstGrid.subbeat+']');
        // console.log('to: ['+dropGrid.bar+','+dropGrid.beat+','+dropGrid.subbeat+']');
        function copySound(sound, destGrid) {
          angular.extend(destGrid.sound, sound);
          destGrid.sound.string = destGrid.string;
        }

        var dragSounds = this.sourceSoundGrids.map(function(grid) {
          var copy = angular.copy(grid.sound);
          delete copy.prev;
          delete copy.next;
          return copy;
        });

        if (evt.dataTransfer.dropEffect === "move") {
          // this.sourceSoundGrids.forEach(function(grid) {
          //   $scope.clearSound(grid.sound);
          // });
          // $scope.clearSound(this.sourceSoundGrids[0].sound);
          this.sourceSoundGrids.forEach(function(sound) {
            workspace.trackSection.clearSound(sound);
          });
        }

        var prevGrid;
        dragSounds.forEach(function(dragSound) {
          copySound(dragSound, dropGrid);
          if (prevGrid) {
            connectGrids(prevGrid, dropGrid);
          }
          prevGrid = dropGrid;
          dropGrid = rightGrid(workspace, dropGrid);
        });
        /*
        copySound(dragSounds[0], dropGrid);
        var nextGrid = rightGrid(dropGrid);
        copySound(dragSounds[1], nextGrid);
        connectGrids(dropGrid, nextGrid);*/
      }
    };

    function DragAndDrop() {
      // var dropElem = document.createElement('div');
      // dropElem.className = 'drop-area';
      document.body.appendChild(dropArea.elem);

      var scope = angular.element(document.body).scope();
      scope.$on('ANGULAR_DRAG_START', function(evt, e, channel, data) {
        console.log('ANGULAR_DRAG_START: '+channel);
        console.log(data);
        dragData = data.data;

        dragHandler = null;
        if (channel === 'fretboard') {
          dragHandler = fretboardDragHandler;
        } else if (channel === 'bassboard') {
          if (dragData.sound.next || dragData.sound.prev) {
            dragHandler = groupSoundDragHandler;
          } else {
            dragHandler = singleSoundDragHandler;
          }
        }
        if (dragHandler) {

          // var beat = workspace.trackSection.beat(dragData.bar, dragData.beat);
          // dragData.widths = {};
          // dragData.widths[beat.subdivision] = evt.target.offsetWidth;
          // if (beat.subdivision === 4) {
          //   dragData.widths[3] = (2/3)*dragData.widths[4];
          // } else {
          //   dragData.widths[4] = (3/2)*dragData.widths[3];
          // }

          var beatWidth = swiperControl.instrumentSwiper.slides[0].clientWidth;
          var width = beatWidth * getSoundLength(dragData.sound);
          dragData.widths = {
            4: width,
            3: (2/3)*width
          }

          dragHandler.onDragStart(e, dragData, channel);
        }
      });

      scope.$on('ANGULAR_DRAG_END', function(evt, e, channel) {
        if (channel === 'fretboard' || channel === 'bassboard') {
          // console.log('ANGULAR_DRAG_END');
          dragHandler.onDragEnd(e, channel);
          dropArea.visible = false;
        }
      });
    }

    DragAndDrop.prototype.dropValidation = function(instrument, grid, data) {
      if (grid.sound.note || !data.sound.note) {
        return false;
      }
      if (data.sound.note.type === 'ghost') {
        return true;
      }
      var fret = instrument.stringFret(grid.string, data.sound.note);
      return fret !== -1;
    };

    DragAndDrop.prototype.onDrop = function(evt, data, dropGrid) {
      dragHandler.onDrop(evt, data, dropGrid);
      var sound = data.sound;
      if (sound.note && sound.note.type !== 'ghost') {
        dropGrid.sound.note.fret = workspace.track.instrument.stringFret(dropGrid.sound.string, sound.note);
      }
      dropArea.elem.style.opacity = 0.001;
      // $scope.updateBassGrid(dropGrid);
    };

    function findGridContainer(elem) {
      var e = elem;
      var maxDepth = 10;
      while (e.className.indexOf("bass-subbeat") === -1) {
        //console.log(e.className);
        e = e.parentElement;
        if (maxDepth-- === 0) {
          return null;
        };
      }
      return e;
    }

    DragAndDrop.prototype.onDragEnter = function(beat, grid, evt) {

      setTimeout(function() {
        var target = findGridContainer(evt.target);
        var box = target.getBoundingClientRect();
        var width = dragData.widths[beat.subdivision];
        dropArea.setPxStyles({
          left: box.left,
          top: box.top+1,
          width: width
        });
        dropArea.elem.style.opacity = 1;
      });
    };

    DragAndDrop.prototype.onDragLeave = function() {
      dropArea.elem.style.opacity = 0.001;
    };


    return new DragAndDrop();
  }


  function resizeHandler($timeout, workspace, swiperControl, basicHandler) {

    var noteLengthSymbols = {
      1: '𝅝',
      0.5: '𝅗𝅥',
      0.25: '𝅘𝅥',
      0.125: '𝅘𝅥𝅮',
      0.0625: '𝅘𝅥𝅯'
    };

    var noteLengths = [
      {
        length: 1,
        dotted: false
      }, {
        length: 1,
        dotted: true
      }, {
        length: 1/2,
        dotted: false
      }, {
        length: 1/2,
        dotted: true
      }, {
        length: 1/4,
        dotted: false
      }, {
        length: 1/4,
        dotted: true
      }, {
        length: 1/8,
        dotted: false
      }, {
        length: 1/8,
        dotted: true
      }, {
        length: 1/16,
        dotted: false
      }
    ];

    var notesWidths;
    var resizeLength;

    return {
      onResizeStart: function(grid, info, subdivision) {
        console.log('onResizeStart');
        basicHandler.selectGrid({target: info.element[0]}, grid);

        var beatWidth = swiperControl.barSwiper.slides[0].clientWidth;
        if (subdivision === 3) {
          beatWidth = beatWidth*(2/3);
        }
        beatWidth = parseInt(beatWidth);

        notesWidths = noteLengths.map(function(noteLength) {
          var length = noteLength.dotted? noteLength.length*1.5 : noteLength.length;
          noteLength.beatLength = length;
          var width = length * workspace.section.timeSignature.bottom*beatWidth;
          return width;
        });

        // wait for grid selection (css) for better accuracy
        if (this.$apply) { // if bound to Scope
          this.$apply();
        }
        $timeout(function() {
          var containerElem = info.element.parent()[0];
          // this.selected.element
          dropArea.elem.style.opacity = '1';
          var box = containerElem.getBoundingClientRect();
          dropArea.setPxStyles({
            left: box.left,
            top: box.top,
            width: info.width
          });
        }, 10);
      },

      onResize: function(grid, info) {
        var delta, closestWidth;;
        var minDelta = notesWidths[0];
        notesWidths.forEach(function(width, index) {
          delta = Math.abs(info.width-width);
          if (delta < minDelta) {
            closestWidth = width;
            minDelta = delta;
            resizeLength = noteLengths[index];
          }
        });
        dropArea.setPxStyles({width: closestWidth});
        var label = noteLengthSymbols[resizeLength.length];
        if (resizeLength.dotted) {
          label += ' .';
        }
        dropArea.setLabel(label);
      },

      onResizeEnd: function(grid, info, evt) {
        // var box = info.element[0].getBoundingClientRect();
        // console.log(box);
        var resizeElem  = info.element[0];
        resizeElem.style.display = "none";
        var resizeBox = dropArea.elem.getBoundingClientRect();
        var x = resizeBox.left + resizeBox.width - 10;
        var elem = document.elementFromPoint(x, resizeBox.top+10);
        resizeElem.style.display = "";

        var targetGrid = angular.element(elem.parentElement).scope().grid;
        if (targetGrid && !grid.sound.next) {
          var targetSound = targetGrid.sound;
          if (targetSound && targetSound.note && targetSound.note.type === 'regular') {
            if (grid !== targetGrid) {
              grid.sound.note.type = 'slide';
              grid.sound.note.slide = {
                endNote: angular.copy(targetSound.note)
              };
              workspace.trackSection.clearSound(targetSound);
            }
          }
        }
        info.element.css('width', '');
        dropArea.setLabel('');
        dropArea.elem.style.opacity = 0.001;
        $timeout(function() {
          angular.extend(grid.sound.noteLength, resizeLength);
        });
        evt.stopPropagation();
      }

    }
  }

  function basicHandler($timeout, workspace, audioPlayer) {

    return {
      selected: {
        grid: null,
        element: null
      },
      selectGrid: function(evt, grid, focus) {
        this.selected.grid = grid;
        this.selected.element = findRootContainer(evt.target).querySelector('.bass-sound-container');
        if (focus) {
          this.selected.element.focus();
        }
      },
      clearSelection: function(evt) {
        console.log(evt.target.className);
        // if (evt.target.className.indexOf('bass-board-container') !== -1) {
        this.selected.grid = null;
        this.selected.element = null;
        // }
      },

      soundStyleChanged: function(style) {
        console.log('soundStyleChanged: '+style);
        if (style === 'hammer' || style === 'pull' || style === 'ring') {
          var elemBox = this.selected.element.getBoundingClientRect();

          var backdropElements = Array.from(
            document.querySelectorAll('md-backdrop.md-menu-backdrop, div.md-scroll-mask')
          );
          backdropElements.forEach(function(elem) {
            elem.style.visibility = 'hidden';
          });

          var elemOnLeft = document.elementFromPoint(elemBox.left-10, elemBox.top+10);
          var leftElemGrid = angular.element(elemOnLeft).scope().grid;

          if (leftElemGrid) {
            connectGrids(leftElemGrid, this.selected.grid);
            if (style === 'ring') {
              var ringNote = this.selected.grid.sound.note;
              var prevNote = leftElemGrid.sound.note.type === 'slide'? leftElemGrid.sound.note.slide.endNote : leftElemGrid.sound.note;
              var fretOffset = this.selected.grid.sound.note.fret - prevNote.fret;
              console.log(fretOffset);
              // this.selected.grid.sound.note = angular.copy(leftElemGrid.sound.note);
              if (fretOffset === 0) {
                this.selected.grid.sound.note = {
                  type: 'regular',
                  code: prevNote.code,
                  fret: prevNote.fret,
                  name: prevNote.name,
                  octave: prevNote.octave
                };
              } else {
                this.selected.grid.sound.note = {
                  type: 'slide',
                  code: prevNote.code,
                  fret: prevNote.fret,
                  name: prevNote.name,
                  octave: prevNote.octave,
                  slide: {
                    endNote: {
                      code: ringNote.code,
                      fret: ringNote.fret,
                      name: ringNote.name,
                      octave: ringNote.octave
                    }
                  }
                };
              }
            }
          } else {
            this.selected.grid.sound.style = 'finger';
          }

          backdropElements.forEach(function(elem) {
            elem.style.visibility = '';
          });
        } else {
          if (this.selected.grid.sound.prev) {
            delete getGridInfo(this.selected.grid.sound.prev).grid.sound.next;
            delete this.selected.grid.sound.prev;
          }
        }
      },

      keyPressed: function(evt) {
        console.log(evt.keyCode);
        if (this.selected.element) {
          switch (evt.keyCode) {
            case 46: // Del
              return this.clearSound(this.selected.grid.sound);
            case 72: // h
              this.selected.grid.sound.style = 'hammer';
              this.soundStyleChanged('hammer');
              break;
            case 80: // p
              this.selected.grid.sound.style = 'pull';
              this.soundStyleChanged('pull');
              break;
             case 82: // r
              this.selected.grid.sound.style = 'ring';
              this.soundStyleChanged('ring');
              break;
          }
        }
      }
    };
  }

})();