(function() {
  'use strict';

  angular
    .module('bd.app')
    .factory('dragHandler', dragHandler)
    .factory('basicHandler', basicHandler)


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
  function dragHandler(workspace, audioPlayer, swiperControl) {

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

    function updateSoundFret(sound, string) {
      if (sound.note.hasOwnProperty('fret')) {
        sound.note.fret = workspace.track.instrument.stringFret(string, sound.note);
      }
      if (sound.note.slide) {
        sound.note.slide.endNote.fret = workspace.track.instrument.stringFret(string, sound.note.slide.endNote);
      }
    }

    var fretboardDragHandler = {
      dragContainer: null,
      onDragStart: function(evt, dragData, channel) {
        if (!this.dragContainer) {
          this.dragContainer = angular.element('<div></div>')[0];
          this.dragContainer.style.position = 'fixed';
          this.dragContainer.style.top = '-100px';
          document.body.appendChild(this.dragContainer);
        }
        var dragElem = evt.target.parentElement.cloneNode(true);
        dragElem.classList.add('drag');
        dragElem.style.width = evt.target.parentElement.offsetWidth+'px';
        this.dragContainer.appendChild(dragElem);
        evt.dataTransfer.setDragImage(dragElem, 8, 12);
      },
      onDragEnd: function(evt) {
        while (this.dragContainer.lastChild) {
          this.dragContainer.lastChild.remove();
        }
      },
      onDrop: function(evt, data, dropGrid) {
        angular.extend(dropGrid.sound, data.sound);
        dropGrid.sound.string = dropGrid.string.label;
        dropGrid.sound.noteLength.beatLength = dropGrid.sound.noteLength.length;
        if (data.sound.note.type !== 'ghost') {
          dropGrid.sound.note.fret = workspace.track.instrument.stringFret(dropGrid.sound.string, dropGrid.sound.note);
        }
        audioPlayer.fetchSoundResources(dropGrid.sound);
      }
    };

    var singleSoundDragHandler = {
      onDragStart: function(evt, dragData, channel) {
        // align drag element
        evt.dataTransfer.setDragImage(evt.target, 8, 12);

        if (!evt.ctrlKey) {
          setTimeout(function() {
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
        updateSoundFret(dropGrid.sound, dropGrid.sound.string);
        if (evt.dataTransfer.dropEffect === "move") {
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
        evt.dataTransfer.setDragImage(dragElem, 8, 42);
        dragBox.width = dragElem.clientWidth;
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
          updateSoundFret(copy, dropGrid.string.label);
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
        // console.log(data);
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
      dragBox.elem.style.opacity = 0.001;
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
          width: width,
          height: box.height
        });
        dragBox.elem.style.opacity = 1;
      });
    };

    DragAndDrop.prototype.onDragLeave = function() {
      dragBox.elem.style.opacity = 0.001;
    };

    return new DragAndDrop();
  }


  function basicHandler(workspace, audioPlayer) {

    return {
      selected: {
        sound: null,
        element: null
      },
      selectSound: function(evt, sound, focus) {
        console.log('selectSound');
        if (this.selected.element) {
          this.selected.element.classList.remove('selected');
        }
        this.selected.sound = sound;
        this.selected.element = soundContainerElem(evt.target).parentElement;
        this.selected.element.classList.add('selected');
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
                    start: 0.05,
                    end: 0.85,
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
            case 109: // -
              sound.volume -= 0.1;
              console.log(sound.volume);
              break;
            case 107: // +
              sound.volume += 0.1;
              console.log(sound.volume);
              break;
          }
        }
      }
    }
  }

    function bassResizeHandler(ResizeHandler, eventHandler, workspace) {
      class BassResizeHandler extends ResizeHandler {

        beforeResize(sound, info) {
          console.log('bass beforeResize');
        }

        afterResize(sound, info) {
          function barPosition(beat, value) {
            return (beat.bar - 1 ) * workspace.section.timeSignature.top + beat.beat - 1 + value;
          }
          var endPosition = barPosition(sound.beat, sound.end);
          console.log(endPosition)
          var beat = sound.beat;
          var overlappingSound;


          var sounds = [].concat(workspace.trackSection.beatSounds(beat));
          while (beat && barPosition(beat, 1) < endPosition) {
            beat = workspace.trackSection.nextBeat(beat);
            Array.prototype.push.apply(sounds, workspace.trackSection.beatSounds(beat));
          }
          console.log(sounds);
          for (var i = 0; i < sounds.length; i++) {
            var s = sounds[i];
            if (s !== sound && barPosition(s.beat, s.start) < endPosition && barPosition(s.beat, s.end) >= endPosition) {
              console.log('overlapping');
              overlappingSound = s;
              break;
            }
          }
          if (overlappingSound && !overlappingSound.next && overlappingSound.note && overlappingSound.note.type === 'regular') {
            sound.note.type = 'slide';
            sound.note.slide = {
              endNote: angular.copy(overlappingSound.note)
            };

            workspace.trackSection.deleteSound(overlappingSound);
          }
        }
      }
      return new BassResizeHandler();
    }

  angular
    .module('bd.app')
    .factory('bassResizeHandler', bassResizeHandler)

})();