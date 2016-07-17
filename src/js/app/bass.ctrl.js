(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('NoteController', NoteController);

  function NoteController($scope, $timeout, $mdMenu, audioPlayer) {
    console.log('NOTE CONTROLLER');
    var noteLengthSymbols = {
      1: '𝅝',
      0.5: '𝅗𝅥',
      0.25: '𝅘𝅥',
      0.125: '𝅘𝅥𝅮',
      0.0625: '𝅘𝅥𝅯'
    };
    $scope.selected = {
      grid: null,
      element: null
    };

    $scope.bass.strings.forEach(function(string) {
      // console.log($scope.bass.notes.list);
      string.notes = $scope.bass.notes.list.slice(string.noteIndex, string.noteIndex+25);

      var stringNoteLabel = [];
      string.notes.forEach(function(note, fret) {
        note.label.forEach(function(label) {
          stringNoteLabel.push({
            fret: fret,
            label: label,
            octave: note.octave
          });
        });
      });
      string.stringNoteLabel = stringNoteLabel;
      // console.log(stringNoteLabel);
    });

    var notesLabels = [];
    $scope.bass.notes.scaleNotes.forEach(function(note) {
      notesLabels.push.apply(notesLabels, note.label);
    });
    $scope.notesLabels = notesLabels;
    $scope.dropNote = {
      width: 0
    };
    $scope.menu = {
      element: null,
      open: angular.noop,
      grid: null, // set when opened,
      sound: null,
      nextNote: function() {
        var fret = this.sound.note.fret || 0;
        var string = $scope.bass.strings[this.grid.string];
        if (fret < 24) {
          this.sound.note = angular.copy(this.sound.note);
          var currentNote = string.notes[fret];
          if (currentNote.label.length === 2 && this.sound.note.code === currentNote.label[0]+currentNote.octave) {
            angular.extend(this.sound.note, {
              code: currentNote.label[1]+currentNote.octave,
              name: currentNote.label[1],
              octave: currentNote.octave,
              fret: fret
            });
          } else {
            fret++;
            var nextNote = string.notes[fret];
            angular.extend(this.sound.note, {
              code: nextNote.label[0]+nextNote.octave,
              name: nextNote.label[0],
              octave: nextNote.octave,
              fret: fret
            });
          }
          $scope.soundPitchChanged(this.sound);
        }
      },
      prevNote: function() {
        var fret = this.sound.note.fret || 0;
        var string = $scope.bass.strings[this.grid.string];
        if (fret > 0) {
          this.sound.note = angular.copy(this.sound.note);
          var currentNote = string.notes[fret];
          if (currentNote.label.length === 2 && this.sound.note.code === currentNote.label[1]+currentNote.octave) {
            angular.extend(this.sound.note, {
              code: currentNote.label[0]+currentNote.octave,
              name: currentNote.label[0],
              octave: currentNote.octave,
              fret: fret
            });
          } else {
            fret--;
            var prevNote = string.notes[fret];
            angular.extend(this.sound.note, {
              code: prevNote.label[prevNote.label.length-1]+prevNote.octave,
              name: prevNote.label[prevNote.label.length-1],
              octave: prevNote.octave,
              fret: fret
            });
          }
          $scope.soundPitchChanged(this.sound);
        }
      },
      updateSlide: function() {
        var endindex = this.sound.note.fret+this.sound.note.slide;
        if (endindex < 0) {
          this.sound.note.slide += -(endindex);
        } else if (endindex > 24) {
          this.sound.note.slide -= endindex-24;
        }
        this.slideEndNote = this.stringNotes[this.sound.note.fret+this.sound.note.slide];
      }
    };

    $timeout(function() {
      $scope.menu.element = angular.element(document.getElementById('bass-sound-menu'));
    }, 500);

    $scope.clearSound = function(sound) {
      // TODO: move to section class?
      delete sound.note;
      delete sound.noteLength;
      delete sound.style;

      if (sound.next) {
        $scope.clearSound(getGridInfo(sound.next).grid.sound);
      }
      if (sound.prev) {
        disconnectGridSound(sound);
      }
      $scope.selected.grid = null;
      $scope.selected.element = null;
    };

    var notesWidths;
    var widthToLength = {};
    var closestWidth;
    $scope.onResizeStart = function(grid, info, subdivision) {
      // console.log('onResizeStart');
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
      var beatWidth = $scope.barSwiper.size / $scope.slides.beatsPerView;
      if (subdivision === 3) {
        beatWidth = beatWidth*(2/3);
      }
      beatWidth = parseInt(beatWidth);

      widthToLength = {};
      notesWidths = noteLengths.map(function(noteLength) {
        var length = noteLength.dotted? noteLength.length*1.5 : noteLength.length;
        var width = length*$scope.section.timeSignature.bottom*beatWidth;
        widthToLength[width] = noteLength;
        return width;
      });
      var containerElem = info.element.parent()[0];
      $scope.dropNote.visible = true;
      $scope.dropNote.width = info.width;
      var box = containerElem.getBoundingClientRect();
      $scope.dropNote.left = box.left;
      $scope.dropNote.top = box.top;

      $scope.$apply();
    };

    $scope.onResizeEnd = function(grid, info, evt) {
      // var box = info.element[0].getBoundingClientRect();
      // console.log(box);
      var resizeElem  = info.element[0];
      resizeElem.style.display = "none";
      var x = $scope.dropNote.left+$scope.dropNote.width-10;
      var elem = document.elementFromPoint(x, $scope.dropNote.top+10);
      resizeElem.style.display = "";

      var targetGrid = angular.element(elem.parentElement).scope().grid;
      if (targetGrid && !grid.sound.next) {
        var targetSound = targetGrid.sound;
        if (targetSound && targetSound.note) {
          if (grid !== targetGrid) {
            console.log('CONVERT TO SLIDE');
            // info.element.css('width', '');
            // $scope.dropNote.visible = false;
            grid.sound.note.type = 'slide';
            grid.sound.note.slide = targetSound.note.fret-grid.sound.note.fret;
            $scope.clearSound(targetSound);
          }
        }
      }
      info.element.css('width', '');
      angular.extend(grid.sound.noteLength, widthToLength[closestWidth]);
      $scope.updateBassGrid(grid);
      $scope.dropNote.resizeNoteLength = '';
      $scope.dropNote.visible = false;
      $scope.$apply();
      evt.stopPropagation();
    };

    $scope.onResize = function(grid, info) {
      var delta;
      var minDelta = notesWidths[0];
      notesWidths.forEach(function(width) {
        delta = Math.abs(info.width-width);
        if (delta < minDelta) {
          closestWidth = width;
          minDelta = delta;
        }
      });
      $scope.dropNote.width = closestWidth;
      var noteLength = widthToLength[closestWidth];
      $scope.dropNote.resizeNoteLength = noteLengthSymbols[noteLength.length]+(noteLength.dotted? '.' : '');
      $scope.$apply();
    };

    $scope.onDrop = function(evt, dragData, dropGrid, section) {
      // console.log('onDrop');
      // console.log(dragData);
      // console.log(dropGrid);
      dragHandler.onDrop(evt, dragData, dropGrid);
      $scope.dropNote.visible = false;

      $timeout(function() {
        $scope.selectGrid(evt, dropGrid);
        $scope.selected.element.focus();
      });
    };

    $scope.updateBassGrid = function(grid) {
      console.log('updateBassGrid');
      var sound = grid.sound;
      if (sound.note && sound.note.type !== 'ghost') {
        sound.note.fret = $scope.bass.stringFret(sound.string, sound.note);

        if (sound.noteLength) {
          var length = sound.noteLength.length;
          if (sound.noteLength.dotted) {
            length *= 1.5;
          }
          sound.noteLength.beatLength = length;
        }

        if (sound.next) {
          console.log('resize group');
          // create copy of old 'next sounds chain' before deleting
          var oldNextSounds = [];
          var next = sound.next;
          while (next) {
            var oldNextGrid = getGridInfo(next).grid;
            oldNextSounds.push(angular.copy(oldNextGrid.sound));
            next = oldNextGrid.sound.next;
          }
          console.log(oldNextSounds);
          // delete old sounds chain
          $scope.clearSound(getGridInfo(sound.next).grid.sound);

          // make new 'next sounds chain' on correct positions
          var prevGrid = grid;
          oldNextSounds.forEach(function(oldNextSound) {
            var newNextGrid = rightGrid(prevGrid);
            angular.extend(newNextGrid.sound, oldNextSound);
            connectGrids(prevGrid, newNextGrid);
            prevGrid = newNextGrid;
          });
        }

        // resolve prev/next sound references
        if (sound.prev && angular.isUndefined(sound.prev.ref)) {
          Object.defineProperty(sound.prev, 'ref', {value: 'static', writable: true});
          sound.prev.ref = $scope.section.bassSubbeat(sound.prev.bar, sound.prev.beat, sound.prev.subbeat)[sound.prev.string].sound;
        }
        if (sound.next && angular.isUndefined(sound.next.ref)) {
          Object.defineProperty(sound.next, 'ref', {value: 'static', writable: true});
          sound.next.ref = $scope.section.bassSubbeat(sound.next.bar, sound.next.beat, sound.next.subbeat)[sound.next.string].sound;
        }
      }
    };

    $scope.soundPitchChanged = function(sound) {
      console.log(sound);
      var nextSound = sound.next;
      var fret = sound.note.fret;
      while (nextSound) {
        nextSound = nextSound.ref;
        nextSound.note.name = sound.note.name;
        nextSound.note.octave = sound.note.octave;
        nextSound.note.code = sound.note.code;
        nextSound.note.fret = fret;
        if (nextSound.note.type === 'slide') {
          fret += nextSound.note.slide;
          console.log('slide '+fret);
        }
        nextSound = nextSound.next;
      }
    };

    $scope.onDragEnter = function(evt, $data) {

      var target = findRootContainer(evt.target);

      var subdivision = $scope.section.bassBeat($data.bar, $data.beat).subdivision;
      $timeout(function() {
        $scope.dropNote.visible = true;
        var box = target.getBoundingClientRect();
        $scope.dropNote.left = box.left;
        $scope.dropNote.top = box.top+1;
        if ($scope.dropNote.subdivision !== subdivision) {
          if ($scope.dropNote.subdivision === 4 && subdivision === 3) {
            $scope.dropNote.width = $scope.dropNote.width * (2/3);
            $scope.dropNote.subdivision = subdivision;
          } else {
            $scope.dropNote.width = $scope.dropNote.width * (3/2);
            $scope.dropNote.subdivision = subdivision;
          }
        }
      });
    };

    $scope.onDragLeave = function(evt, $data) {
      $scope.dropNote.visible = false;
    };


    var fretboardDragHandler = {
      onDragStart: function(evt, dragData, channel) {
        var sound = dragData.sound;
        if (sound.note.type !== 'ghost') {
          var elemBox = evt.target.getBoundingClientRect();
                    console.log(evt.clientX);
          console.log(evt.clientX - elemBox.left);
          if (sound.note.label.length > 1 && evt.clientX > elemBox.left+elemBox.width/2) {
            sound.note.name = sound.note.label[1];
          } else {
            sound.note.name = sound.note.label[0];
          }
          sound.note.code = sound.note.name + sound.note.octave;
        }
        // update transfer data
        var transferDataText = angular.toJson({data: sound});
        evt.dataTransfer.setData('text', transferDataText);
        console.log(transferDataText);

        // compute width of the note
        var beatElem = document.getElementById("bass_1_1_1_0").parentElement;
        var beatWidth = beatElem.clientWidth;
        var width = (dragData.sound.noteLength)?
            dragData.sound.noteLength.length * $scope.section.timeSignature.bottom * beatWidth :
            beatWidth / 4;
        $scope.dropNote.width = width;
        $scope.dropNote.subdivision = 4;
      },
      onDragEnd: function(evt) {},
      onDrop: function(evt, dragSound, dropGrid) {
        angular.extend(dropGrid.sound, dragSound);
        dropGrid.sound.string = dropGrid.string;
        audioPlayer.fetchSoundResources(dropGrid.sound);
      }
    };

    var singleSoundDragHandler = {
      onDragStart: function(evt, dragData, channel) {
        // just align drag element to left-top mouse pointer
        evt.dataTransfer.setDragImage(evt.target, 0, 0);

        var beat = $scope.section.bassBeat(dragData.bar, dragData.beat);
        $scope.dropNote.width = evt.target.offsetWidth;
        $scope.dropNote.subdivision = beat.subdivision;
        if (!evt.ctrlKey) {
          $timeout(function() {
            angular.element(evt.target).addClass("drag-move-element");
          }, 100);
        }
      },
      onDragEnd: function(evt) {
        angular.element(evt.target).removeClass("drag-move-element");
      },
      onDrop: function(evt, dragData, dropGrid) {
        angular.extend(dropGrid.sound, dragData.sound);
        dropGrid.sound.string = dropGrid.string;

        if (evt.dataTransfer.dropEffect === "move") {
          var sourceSound = section.bassSubbeat(dragData.bar, dragData.beat, dragData.subbeat)[dragData.string].sound;
          $scope.clearSound(sourceSound);
        }
      }
    };

    var groupSoundDragHandler = {
      onDragStart: function(evt, dragData, channel) {
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
        dragElem.addClass($scope.bass.settings.label);
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
        $scope.dropNote.width = dragElem.clientWidth;
        var beat = $scope.section.bassBeat(dragData.bar, dragData.beat);
        $scope.dropNote.subdivision = beat.subdivision;

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
      onDrop: function(evt, dragData, dropGrid) {
        // var firstGrid = this.sourceSoundGrids[0];
        // console.log('from: ['+firstGrid.bar+','+firstGrid.beat+','+firstGrid.subbeat+']');
        // console.log('to: ['+dropGrid.bar+','+dropGrid.beat+','+dropGrid.subbeat+']');
        function copySound(sound, destGrid) {
          angular.extend(destGrid.sound, sound);
          destGrid.sound.string = destGrid.string;
          // $scope.updateBassGrid(destGrid);
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
          $scope.clearSound(this.sourceSoundGrids[0].sound);
        }

        var prevGrid;
        dragSounds.forEach(function(dragSound) {
          copySound(dragSound, dropGrid);
          if (prevGrid) {
            connectGrids(prevGrid, dropGrid);
          }
          prevGrid = dropGrid;
          dropGrid = rightGrid(dropGrid);
        });
        /*
        copySound(dragSounds[0], dropGrid);
        var nextGrid = rightGrid(dropGrid);
        copySound(dragSounds[1], nextGrid);
        connectGrids(dropGrid, nextGrid);*/
      }
    };

    var dragHandler;
    $scope.$root.$on('ANGULAR_DRAG_START', function(evt, e, channel, data) {
      console.log('ANGULAR_DRAG_START');
      // console.log(data);
      var dragData = data.data;

      if (dragData.handler === 'fretboard') {
        dragHandler = fretboardDragHandler;
      } else {
        if (dragData.sound.next || dragData.sound.prev) {
          dragHandler = groupSoundDragHandler;
        } else {
          dragHandler = singleSoundDragHandler;
        }
      }
      dragHandler.onDragStart(e, dragData, channel);
    });

    $scope.$on('ANGULAR_DRAG_END', function(evt, e, channel, data) {
      dragHandler.onDragEnd(e, data, channel);
      // console.log('ANGULAR_DRAG_END');
      $scope.dropNote.visible = false;
    });

    $scope.dropValidation = function(grid, $data) {
      // console.log(grid);
      // console.log($data);
      if (grid.sound.note || !$data.sound.note) {
        return false;
      }
      if ($data.sound.note.type === 'ghost') {
        return true;
      }
      var fret = $scope.bass.stringFret(grid.string, $data.sound.note);
      return fret !== -1;
    };

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
      var elem = document.getElementById(id);
      if (elem) {
        return {
          grid: angular.element(elem).scope().grid,
          gridElement: elem.querySelector('.bass-grid'),
          soundElement: elem.querySelector('.bass-sound-container')
        };
      }
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

    // TODO: fix crash on last grid
    function rightGrid(grid) {
      var section = $scope.section;
      var bar = grid.bar;
      var beat = grid.beat;
      var subbeat = grid.subbeat;
      var noteBeatLength = grid.sound.noteLength.beatLength*section.timeSignature.bottom;

      var bassBeat = section.bassBeat(bar, beat);
      var subbeatLength = 1 / bassBeat.subdivision;
      if (bassBeat.subdivision === 3) {
        subbeatLength = subbeatLength * (3/2);
      }

      while (noteBeatLength > 0) {
        subbeat++;
        if (subbeat > bassBeat.subdivision) {
          subbeat = 1;
          beat++;
          if (beat > section.timeSignature.top) {
            beat = 1;
            bar++;
          }
        }
        noteBeatLength-=subbeatLength;
      }
      return getGridInfo({
        bar: bar,
        beat: beat,
        subbeat: subbeat,
        string: grid.string
      }).grid;
    }

    $scope.soundStyleChanged = function(style) {
      console.log('soundStyleChanged: '+style);
      if (style === 'hammer' || style === 'pull' || style === 'ring') {
        var elemBox = $scope.selected.element.getBoundingClientRect();

        var backdropElements = Array.from(
          document.querySelectorAll('md-backdrop.md-menu-backdrop, div.md-scroll-mask')
        );
        backdropElements.forEach(function(elem) {
          elem.style.visibility = 'hidden';
        });

        var elemOnLeft = document.elementFromPoint(elemBox.left-10, elemBox.top+10);
        var leftElemGrid = angular.element(elemOnLeft).scope().grid;

        if (leftElemGrid) {
          connectGrids(leftElemGrid, $scope.selected.grid);
          if (style === 'ring') {
            var prevEndFret = leftElemGrid.sound.note.fret+(leftElemGrid.sound.note.slide || 0);
            var fretOffset = $scope.selected.grid.sound.note.fret - prevEndFret;
            console.log(fretOffset);
            // $scope.selected.grid.sound.note = angular.copy(leftElemGrid.sound.note);
            $scope.selected.grid.sound.note.type = fretOffset === 0? 'regular' : 'slide';
            if (fretOffset !== 0) {
              $scope.selected.grid.sound.note.code = ' ';
              $scope.selected.grid.sound.note.fret = prevEndFret;
              $scope.selected.grid.sound.note.slide = fretOffset;
            }
          }
        } else {
          $scope.selected.grid.sound.style = 'finger';
        }

        backdropElements.forEach(function(elem) {
          elem.style.visibility = '';
        });
      } else {
        if ($scope.selected.grid.sound.prev) {
          delete getGridInfo($scope.selected.grid.sound.prev).grid.sound.next;
          delete $scope.selected.grid.sound.prev;
        }
      }
    };

    $scope.selectGrid = function(evt, grid) {
      $scope.selected.grid = grid;
      $scope.selected.element = findRootContainer(evt.target).querySelector('.bass-sound-container');
    };

    $scope.openBassSoundMenu = function(evt, grid) {
      $scope.selectGrid(evt, grid);

      var box = evt.target.getBoundingClientRect();
      if (!grid.sound.volume) {
        grid.sound.volume = 0.8;
      }
      // $scope.menu.element.css('left', box.left+'px');
      // $scope.menu.element.css('top', 32+box.top+'px');
      $scope.menu.element.css('left', (evt.clientX-20)+'px');
      $scope.menu.element.css('top', 32+box.top+'px');
      $mdMenu.hide().then(function() {
        grid.sound.string = grid.string;
        $scope.menu.sound = grid.sound;
        $scope.menu.grid = grid;
        $scope.menu.stringNotes = $scope.bass.strings[grid.string].notes;
        $timeout(function() {
          $scope.menu.open(evt);
        });
      });
    };

    $scope.keyPressed = function(evt) {
      console.log(evt.keyCode);
      switch (evt.keyCode) {
        case 46: // Del
          return $scope.clearSound($scope.selected.grid.sound);
        case 72: // h
          if ($scope.selected.element) {
            $scope.selected.grid.sound.style = 'hammer';
            $scope.soundStyleChanged('hammer');
          }
          break;
        case 80: // p
          if ($scope.selected.element) {
            $scope.selected.grid.sound.style = 'pull';
            $scope.soundStyleChanged('pull');
          }
          break;
         case 82: // r
          if ($scope.selected.element) {
            $scope.selected.grid.sound.style = 'ring';
            $scope.soundStyleChanged('ring');
          }
          break;
      }
    };

    $scope.clearSelection = function(evt) {
      console.log(evt.target.className);
      // if (evt.target.className.indexOf('bass-board-container') !== -1) {
        $scope.selected.grid = null;
        $scope.selected.element = null;
      // }
    };

    $scope.playSound = function(sound) {
      if (sound.note) {
        audioPlayer.playBassSample(sound);
      }
    };
  }

})();
