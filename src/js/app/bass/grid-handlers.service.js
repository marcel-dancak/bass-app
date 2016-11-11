(function() {
  'use strict';

  angular
    .module('bd.app')
    .factory('dragHandler', dragHandler)
    .factory('resizeHandler', resizeHandler)
    .factory('basicHandler', basicHandler);


  /***************** Private helper functions ******************/

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
      string: grid2.string.label
    };
    Object.defineProperty(grid1.sound.next, 'ref', {value: 'static', writable: true});
    grid1.sound.next.ref = grid2.sound;

    grid2.sound.prev = {
      bar: grid1.bar,
      beat: grid1.beat,
      subbeat: grid1.subbeat,
      string: grid1.string.label
    };
    Object.defineProperty(grid2.sound.prev, 'ref', {value: 'static', writable: true});
    grid2.sound.prev.ref = grid1.sound;
  }

  function disconnectGridSound(sound) {
    console.log('disconnectGridSound');
    if (sound.prev) {
      delete getGridInfo(sound.prev).grid.sound.next;
      delete sound.prev;
    }
    if (sound.next) {
      delete getGridInfo(sound.next).grid.sound.prev;
      delete sound.next;
    }
  }


  var dragBox = {
    elem: angular.element('<div class="drag-box"></div>')[0],
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
      if (sound.note.type === 'ghost') {
        return 1/4; // or workspace.section.timeSignature.bottom * 1/16 ?
      }
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
          sound.note.code = sound.note.name + sound.note.octave;

          // store note name depending on drag click position (use it at drop)
          var secondName = dragData.label.length > 1 && evt.clientX > elemBox.left+elemBox.width/2;
          fretboardDragHandler._noteName = dragData.label[secondName? 1 : 0];
        }
      },
      onDragEnd: function(evt) {},
      onDrop: function(evt, data, dropGrid) {
        angular.extend(dropGrid.sound, data.sound);
        dropGrid.sound.note.name = fretboardDragHandler._noteName;
        dropGrid.sound.note.code = dropGrid.sound.note.name + dropGrid.sound.note.octave;
        dropGrid.sound.string = dropGrid.string.label;
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
            evt.target.classList.add("drag-move-element");
          }, 100);
        }
      },
      onDragEnd: function(evt) {
        evt.target.classList.remove("drag-move-element");
      },
      onDrop: function(evt, dragGrid, dropGrid) {
        angular.extend(dropGrid.sound, dragGrid.sound);
        dropGrid.sound.string = dropGrid.string.label;

        if (evt.dataTransfer.dropEffect === "move") {
          // var sourceSound = workspaceSection.subbeat(dragGrid.bar, dragGrid.beat, dragGrid.subbeat)[dragGrid.string].sound;
          // $scope.clearSound(sourceSound);
          workspace.trackSection.clearSound(dragData.sound);
        }
      }
    };

    var groupSoundDragHandler = {
      workspaceElem: null,
      onDragStart: function(evt, dragData, channel) {
        console.log('GROUP Drag Handler');
        if (!this.workspaceElem) {
          this.workspaceElem = document.querySelector('.instrument-grid');
        }
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
        dragElem = dragElem[0];
        soundElements.forEach(function(elem) {
          var clone = elem.cloneNode(true);
          clone.style.width = elem.clientWidth+'px';
          clone.style.position = 'relative';
          clone.style.display = 'inline-block';
          dragElem.appendChild(clone);
        });
        this.workspaceElem.appendChild(dragElem);
        evt.dataTransfer.setDragImage(dragElem, 10, 36);
        dragBox.width = dragElem.clientWidth;
        console.log(dragData);
        var beat = workspace.trackSection.beat(dragData.bar, dragData.beat);
        dragBox.subdivision = beat.subdivision;

        this.dragElement = dragElem;
        this.sourceSoundElements = soundElements;
        this.sourceSoundGrids = grids;
        if (!evt.ctrlKey) {
          // set opacity with delay, to avoid opacity in drag image
          setTimeout(function() {
            soundElements.forEach(function(elem) {
              elem.classList.add("drag-move-element");
            });
          }, 100);
        }
      },
      onDragEnd: function(evt) {
        this.dragElement.remove();
        this.sourceSoundElements.forEach(function(elem) {
          elem.classList.remove("drag-move-element");
        });
      },
      onDrop: function(evt, dragGrid, dropGrid) {
        // var firstGrid = this.sourceSoundGrids[0];
        // console.log('from: ['+firstGrid.bar+','+firstGrid.beat+','+firstGrid.subbeat+']');
        // console.log('to: ['+dropGrid.bar+','+dropGrid.beat+','+dropGrid.subbeat+']');
        function copySound(sound, destGrid) {
          angular.extend(destGrid.sound, sound);
          destGrid.sound.string = destGrid.string.label;
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
          this.sourceSoundGrids.forEach(function(grid) {
            console.log(grid);
            workspace.trackSection.clearSound(grid.sound);
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
      document.body.appendChild(dragBox.elem);

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
          var beatWidth = swiperControl.instrumentSwiper.slides[0].clientWidth;
          var width = 0;
          var sound = dragData.sound;
          // go to the sound beginning and compute width of the whole sound
          while (sound.prev) {
            sound = sound.prev.ref;
          }
          while (sound) {
            width += beatWidth * getSoundLength(sound);
            sound = sound.next? sound.next.ref : null;
          }
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
          dragBox.visible = false;
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
      var fret = instrument.stringFret(grid.string.label, data.sound.note);
      return fret !== -1;
    };

    DragAndDrop.prototype.onDrop = function(evt, data, dropGrid) {
      dragHandler.onDrop(evt, data, dropGrid);
      var sound = data.sound;
      if (sound.note && sound.note.type !== 'ghost') {
        dropGrid.sound.note.fret = workspace.track.instrument.stringFret(dropGrid.sound.string, sound.note);
      }
      dragBox.elem.style.opacity = 0.001;
      // $scope.updateBassGrid(dropGrid);
    };

    DragAndDrop.prototype.onDragEnter = function(beat, grid, evt) {
      // console.log('onDragEnter');

      setTimeout(function() {
        var target = findGridContainer(evt.target);
        var box = target.getBoundingClientRect();
        var width = dragData.widths[beat.subdivision];
        dragBox.setPxStyles({
          left: box.left,
          top: box.top+1,
          width: width
        });
        dragBox.elem.style.opacity = 1;
      });
    };

    DragAndDrop.prototype.onDragLeave = function() {
      dragBox.elem.style.opacity = 0.001;
    };

    return new DragAndDrop();
  }


  function resizeHandler($timeout, workspace, swiperControl, basicHandler) {

    var resizeBox = {
      elem: angular.element('<div class="resize-box"><label></label></div>')[0],
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

    function afterGroupResize(grid) {
      if (grid.sound.next) {
        console.log('resize group');
        // create copy of old 'next sounds chain' before deleting
        var oldNextSounds = [];
        var next = grid.sound.next;
        while (next) {
          var oldNextGrid = getGridInfo(next).grid;
          oldNextSounds.push(angular.copy(oldNextGrid.sound));
          next = oldNextGrid.sound.next;
        }
        console.log(oldNextSounds);
        // delete old sounds chain
        workspace.trackSection.clearSound(getGridInfo(grid.sound.next).grid.sound);

        // make new 'next sounds chain' on correct positions
        var prevGrid = grid;
        oldNextSounds.forEach(function(oldNextSound) {
          var newNextGrid = rightGrid(workspace, prevGrid);
          angular.extend(newNextGrid.sound, oldNextSound);
          connectGrids(prevGrid, newNextGrid);
          prevGrid = newNextGrid;
        });
      }
    }

    return {
      onResizeStart: function(grid, info, subdivision) {
        console.log('onResizeStart');
        basicHandler.selectGrid({target: info.element[0]}, grid);

        // var beatWidth = swiperControl.barSwiper.slides[0].clientWidth;
        var elem = info.element;
        while (elem && !elem.hasClass('subbeats-container')) {
          elem = elem.parent();
        }
        var beatWidth = elem[0].clientWidth;

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

        this.onResize(grid, info);
        resizeBox.elem.style.opacity = '1';
        basicHandler.selected.element.appendChild(resizeBox.elem);
      },

      onResize: function(grid, info) {
        var delta, closestWidth;
        var minDelta = notesWidths[0];
        notesWidths.forEach(function(width, index) {
          delta = Math.abs(info.width-width);
          if (delta < minDelta) {
            closestWidth = width;
            minDelta = delta;
            resizeLength = noteLengths[index];
          }
        });
        resizeBox.setPxStyles({width: closestWidth});
        var label = noteLengthSymbols[resizeLength.length];
        if (resizeLength.dotted) {
          label += ' .';
        }
        resizeBox.setLabel(label);
      },

      onResizeEnd: function(grid, info, evt) {
        // var box = info.element[0].getBoundingClientRect();
        // console.log(box);
        var resizeElem  = info.element[0];
        var box = resizeBox.elem.getBoundingClientRect();
        resizeElem.style.display = "none";

        var x = box.left + box.width - 10;
        var elem = document.elementFromPoint(x, box.top+10);
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
        resizeBox.setLabel('');
        resizeBox.elem.style.opacity = 0.001;
        resizeBox.elem.remove();

        $timeout(function() {
          angular.extend(grid.sound.noteLength, resizeLength);
          afterGroupResize(grid);
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
        this.selected.element = findGridContainer(evt.target).querySelector('.bass-sound-container');
        if (focus) {
          this.selected.element.focus();
        }
      },
      clearSelection: function() {
        // if (evt.target.className.indexOf('bass-board-container') !== -1) {
        this.selected.grid = null;
        this.selected.element = null;
        // }
      },

      soundStyleChanged: function(style) {
        if (style === 'hammer' || style === 'pull' || style === 'ring') {
          var elemBox = this.selected.element.getBoundingClientRect();

          var backdropElements = Array.from(
            //md-backdrop.md-menu-backdrop, div.md-scroll-mask,
            document.querySelectorAll('.md-panel-outer-wrapper')
          );
          backdropElements.forEach(function(elem) {
            elem.style.visibility = 'hidden';
          });

          var elemOnLeft = document.elementFromPoint(elemBox.left-10, elemBox.top+10);
          var leftElemGrid = angular.element(elemOnLeft).scope().grid;
          if (leftElemGrid && leftElemGrid.sound.note) {
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
          var sound = this.selected.grid.sound;
          switch (evt.keyCode) {
            case 46: // Del
              workspace.trackSection.clearSound(sound);
              this.clearSelection();
              break;
            case 72: // h
              sound.style = 'hammer';
              this.soundStyleChanged('hammer');
              break;
            case 80: // p
              sound.style = 'pull';
              this.soundStyleChanged('pull');
              break;
             case 82: // r
              sound.style = 'ring';
              this.soundStyleChanged('ring');
              break;
             case 190: // .
              if (sound.note.type !== 'ghost' && !sound.next) {
                sound.noteLength.staccato = !sound.noteLength.staccato;
              }
              break;
             case 38: // up
              if (sound.note.type === 'regular' && sound.note.fret < 24) {
                sound.note.fret++;
                var bassString = workspace.trackSection.instrument.strings[sound.string];
                var note = bassString.notes[sound.note.fret];
                sound.note.name = note.label[0];
                sound.note.octave = note.octave;
                sound.note.code = sound.note.name+sound.note.octave;
              }
              break;
             case 40: // down
              if (sound.note.type === 'regular' && sound.note.fret > 0) {
                sound.note.fret--;
                var bassString = workspace.trackSection.instrument.strings[sound.string];
                var note = bassString.notes[sound.note.fret];
                sound.note.name = note.label[0];
                sound.note.octave = note.octave;
                sound.note.code = sound.note.name+sound.note.octave;
              }
              break;
          }
        }
      }
    };
  }

})();