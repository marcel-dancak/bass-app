(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('NoteController', NoteController);

  function NoteController($scope, $timeout, $mdMenu, audioPlayer) {
    console.log('NOTE CONTROLLER');
    console.log($scope);
    var noteLengthSymbols = {
      1: '𝅝',
      0.5: '𝅗𝅥',
      0.25: '𝅘𝅥',
      0.125: '𝅘𝅥𝅮',
      0.0625: '𝅘𝅥𝅯'
    };
    $scope.selected = {grid: null};

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
      $scope.menu.element = angular.element(document.getElementById('subbeat-menu'));
    }, 500);

    var dragNote, dragElement;
    $scope.playingStyles = ['finger', 'slap', 'pop', 'tap', 'hammer', 'pull'];

    $scope.clearSound = function(sound) {
      delete sound.note;
      delete sound.noteLength;
      $scope.selected.grid = null;
    };

    var notesWidths;
    var widthToLength = {};
    var closestWidth;
    $scope.onResizeStart = function(grid, info) {
      // console.log('onResizeStart');
      // console.log(info);
      var sound = grid.sound;
      var length = sound.noteLength.beatLength/4;
      var gridWidth = (info.width+3)/length;
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
      widthToLength = {};
      notesWidths = noteLengths.map(function(noteLength) {
        var length = noteLength.dotted? noteLength.length*1.5 : noteLength.length;
        var width = length*gridWidth-2;
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
      console.log(resizeElem.style);
      resizeElem.style.display = "none";
      var x = $scope.dropNote.left+$scope.dropNote.width-10;
      var elem = document.elementFromPoint(x, $scope.dropNote.top+10);
      resizeElem.style.display = "";
      console.log(elem);
      console.log(angular.element(elem.parentElement).scope());
      var targetGrid = angular.element(elem.parentElement).scope().grid;
      if (targetGrid) {
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
      $scope.updateBassSound(grid.sound);
      $scope.dropNote.resizeNoteLength = '';
      $scope.dropNote.visible = false;
      $scope.$apply();
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

    $scope.onDrop = function($event, $data, grid, section) {
      // console.log('onDrop');
      // console.log($data);
      // console.log(grid);

      // grid.sound = angular.copy($data.sound? $data.sound : $data);
      angular.extend(grid.sound, $data.sound? $data.sound : $data);
      grid.sound.string = grid.string;
      $scope.updateBassSound(grid.sound);
      audioPlayer.fetchSoundResources(grid.sound);
      $scope.selected.grid = grid;
      $scope.dropNote.visible = false;

      if (angular.isDefined($data.beat) && $event.dataTransfer.dropEffect === "move") {
        var sourceSound = section.bars[$data.bar-1].bassBeats[$data.beat-1].subbeats[$data.subbeat-1][$data.string].sound;
        $scope.clearSound(sourceSound);
      }
    };

    $scope.updateBassSound = function(sound) {
      if (sound.note.type === 'ghost') {
        sound.noteLength = {
          length: 1/16
        };
      }
      // sound.note.fret = $scope.bass.stringFret(sound.string, sound.note);
      if (sound.noteLength) {
        var length = sound.noteLength.length;
        if (sound.noteLength.dotted) {
          length *= 1.5;
        }
        if (sound.noteLength.staccato) {
          //length -= 0.1;
        }
        // sound.ui.width = 100*(length*$scope.section.timeSignature.bottom*4)+'%';
        sound.noteLength.beatLength = length*4;
      }
    };

    $scope.onDragEnter = function(evt, $data) {
      console.log('enter');

      var target = evt.target || evt.originalTarget;
      if (target.tagName === 'BUTTON') {
        // target = target.parentElement.parentElement;
        target = target.parentElement;
      }
      $timeout(function() {
        $scope.dropNote.visible = true;
        var box = target.getBoundingClientRect();
        $scope.dropNote.left = box.left;
        $scope.dropNote.top = box.top;
        if ($scope.dropNote.width === -1) {
          $scope.dropNote.width = 2*target.clientWidth;
        }
      });
    };

    $scope.onDragLeave = function(evt, $data) {
      $scope.dropNote.visible = false;
    };

    $scope.$root.$on('ANGULAR_DRAG_START', function(evt, e, channel, data) {
      console.log('ANGULAR_DRAG_START');
      console.log(data);
      dragNote = data.data;
      var sound = data.data.sound;
      if (dragNote.source === 'fretboard') {
        if (sound.note.type !== 'ghost') {
          if (sound.note.label.length > 1 && e.clientX > e.target.offsetLeft+e.target.clientWidth/2) {
            sound.note.name = sound.note.label[1];
          } else {
            sound.note.name = sound.note.label[0];
          }
          sound.note.code = sound.note.name+sound.note.octave;
        }
        // update transfer data
        var transferDataText = angular.toJson({data: sound});
        e.dataTransfer.setData('text', transferDataText);
        console.log(transferDataText);
        $scope.dropNote.width = -1;
      } else {
        $scope.dropNote.width = e.target.clientWidth;
        // set opacity with delay, to avoid opacity in drag image
        setTimeout(function() {
          e.target.style.opacity = 0.65;
        }, 100);
      }
      if (!sound.noteLength) {
        return;
      }

      if (!e.ctrlKey) {
        dragElement = angular.element(e.target);
        setTimeout(function() {
          dragElement.addClass('drag-element');
        }, 100);
      }
      $scope.$apply();
    });

    $scope.$on('ANGULAR_DRAG_END', function(evt, e, channel, data) {
      if (dragElement) {
        dragElement.removeClass('drag-element');
        dragElement = null;
      }
      e.target.style.opacity = 1;
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

    $scope.openBassSoundMenu = function(evt, grid) {
      var box = evt.target.getBoundingClientRect();
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

    $scope.playSound = function(sound) {
      audioPlayer.playSound(sound);
    };
  }

})();
