(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('NoteController', NoteController);

  function NoteController($scope, $timeout, $mdMenu, audioPlayer) {
    console.log('NOTE CONTROLLER');
    console.log($scope);
    $scope.selected = {subbeat: null};

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
      subbeat: null, // set when opened
      searchText: '',
      nextNote: function() {
        $scope.menu.subbeat.fret = $scope.menu.subbeat.fret || 0;
        if ($scope.menu.subbeat.fret < 24) {
          var currentNote = $scope.menu.subbeat.string.notes[$scope.menu.subbeat.fret];
          if (currentNote.label.length === 2 && $scope.menu.subbeat.note.code === currentNote.label[0]+currentNote.octave) {
            $scope.menu.subbeat.note = {
              code: currentNote.label[1]+currentNote.octave,
              name: currentNote.label[1],
              octave: currentNote.octave
            };
          } else {
            $scope.menu.subbeat.fret++;
            var nextNote = $scope.menu.subbeat.string.notes[$scope.menu.subbeat.fret];
            $scope.menu.subbeat.note = {
              code: nextNote.label[0]+nextNote.octave,
              name: nextNote.label[0],
              octave: nextNote.octave
            };
          }
        }
      },
      prevNote: function() {
        $scope.menu.subbeat.fret = $scope.menu.subbeat.fret || 0;
        if ($scope.menu.subbeat.fret > 0) {
          var currentNote = $scope.menu.subbeat.string.notes[$scope.menu.subbeat.fret];
          if (currentNote.label.length === 2 && $scope.menu.subbeat.note.code === currentNote.label[1]+currentNote.octave) {
            $scope.menu.subbeat.note = {
              code: currentNote.label[0]+currentNote.octave,
              name: currentNote.label[0],
              octave: currentNote.octave
            };
          } else {
            $scope.menu.subbeat.fret--;
            var prevNote = $scope.menu.subbeat.string.notes[$scope.menu.subbeat.fret];
            $scope.menu.subbeat.note = {
              code: prevNote.label[prevNote.label.length-1]+prevNote.octave,
              name: prevNote.label[prevNote.label.length-1],
              octave: prevNote.octave
            };
          }
        }
      }
    };

    $timeout(function() {
      $scope.menu.element = angular.element(document.getElementById('subbeat-menu'));
    }, 500);

    var dragNote, dragElement;
    $scope.playingStyles = ['finger', 'slap', 'pop', 'tap', 'hammer', 'pull'];

    $scope.clearSound = function(subbeat) {
      delete subbeat.note;
      delete subbeat.noteLength;
      $scope.selected.subbeat = null;
    };

    var notesWidths;
    var widthToLength = {};
    var closestWidth;
    $scope.onResizeStart = function(grid, info) {
      // console.log('onResizeStart');
      // console.log(info);
      var sound = grid.sound;
      var length = sound.noteLength.beatLength/4;
      var gridWidth = (info.width+4)/length;
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

    $scope.onResizeEnd = function(grid, info) {
      info.element.css('width', '');
      angular.extend(grid.sound.noteLength, widthToLength[closestWidth]);
      $scope.updateBassSound(grid.sound);
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
      $scope.selected.subbeat = grid;
      $scope.dropNote.visible = false;

      if (angular.isDefined($data.beat) && $event.dataTransfer.dropEffect === "move") {
        var sourceSound = section.bars[$data.bar-1].bassBeats[$data.beat-1].subbeats[$data.subbeat-1][$data.string].sound;
        $scope.clearSound(sourceSound);
      }
    };

    $scope.updateBassSound = function(sound) {
      if (sound.note.name === 'x') {
        sound.noteLength.length = 1/16;
      }
      sound.fret = $scope.bass.stringFret(sound.string, sound.note);
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
          $scope.dropNote.width = target.clientWidth;
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
        if (sound.note.label.length > 1 && e.clientX > e.target.offsetLeft+e.target.clientWidth/2) {
          sound.note.name = sound.note.label[1];
        } else {
          sound.note.name = sound.note.label[0];
        }
        sound.note.code = sound.note.name+sound.note.octave;
        // update transfer data
        console.log(sound.string);
        console.log($scope.bass.strings);
        var transferDataText = angular.toJson({data: sound});
        e.dataTransfer.setData('text', transferDataText);
        console.log(transferDataText);
        $scope.dropNote.width = -1;
      } else {
        $scope.dropNote.width = e.target.clientWidth;
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
      $scope.dropNote.visible = false;
    });

    $scope.dropValidation = function(grid, $data) {
      // console.log(grid);
      // console.log($data);
      if (grid.sound.note) {
        return false;
      }
      if ($data.sound.note.name === 'x') {
        return true;
      }
      var fret = $scope.bass.stringFret(grid.string, $data.sound.note);
      return fret !== -1;
    };

    $scope.openBassSoundMenu = function(evt, grid) {
      console.log('openBassSoundMenu');
      var box = evt.target.getBoundingClientRect();
      $scope.menu.element.css('left', box.left+'px');
      $scope.menu.element.css('top', 32+box.top+'px');

      $mdMenu.hide().then(function() {
        grid.sound.string = grid.string;
        $scope.menu.sound = grid.sound;
        $scope.menu.grid = grid;
        $timeout(function() {
          $scope.menu.open(evt);
        });
      });
    };

    $scope.playSound = function(sound) {
      audioPlayer.playSound(sound);
    };
    /*
    $scope.section.bars.forEach(function(bar) {
      console.log(bar);
      bar.bass.forEach(function(subbeats) {
        subbeats.forEach(function(subbeat) {
          $scope.updateBassSound(subbeat);
        });
      });
    });*/
  }

})();
