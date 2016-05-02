(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('NoteController', NoteController);

  function NoteController($scope, $element, $timeout, $mdMenu, audioPlayer) {
    console.log('NOTE CONTROLLER');
    console.log($scope);
    console.log($element[0]);
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

    $scope.clearNote = function(subbeat) {
      console.log(subbeat);
      subbeat.note = {};
      subbeat.noteLength.length = 1/16;
      $scope.updateBassSound(subbeat);
      $scope.selected.subbeat = null;
    };

    var notesWidths;
    var widthToLength = {};
    var closestWidth;
    $scope.onResizeStart = function(subbeat, info) {
      // console.log('onResizeStart');
      // console.log(info);
      var length = subbeat.noteLength.dotted? subbeat.noteLength.length*1.5 : subbeat.noteLength.length;
      var subbeatWidth = (info.width+4)/length;
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
        var width = length*subbeatWidth-2;
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

    $scope.onResizeEnd = function(subbeat, info) {
      info.element.css('width', '');
      angular.extend(subbeat.noteLength, widthToLength[closestWidth]);
      $scope.updateBassSound(subbeat);
      $scope.dropNote.visible = false;
      $scope.$apply();
    };

    $scope.onResize = function(subbeat, info) {
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

    $scope.onDrop = function($event, $data, subbeat, section) {
      // console.log('onDrop');
      // console.log($event);
      if (angular.isDefined($data.beat) && $event.dataTransfer.dropEffect === "move") {
        console.log('MOVE');
        //bar[$data.beat*4+$data.subbeat][$data.string.index].note = {};
        //bar[$data.beat*4+$data.subbeat][$data.string.index].noteLength = {};
        $scope.clearNote(section.bars[$data.index-1].bass[$data.beat*4+$data.subbeat][$data.string.index]);
      }
      //subbeat.note = $data.note;
      delete $data.index;
      delete $data.beat;
      delete $data.subbeat;
      delete $data.string;
      angular.extend(subbeat, $data);
      console.log('find fret of '+subbeat.note.name+' od string '+subbeat.string.index);

      $scope.updateBassSound(subbeat);
      console.log(subbeat);
      audioPlayer.fetchSoundResources(subbeat);
      // subbeat.note = $data.note;
      $scope.selected.subbeat = subbeat;
      $scope.dropNote.visible = false;
    };

    $scope.updateBassSound = function(sound) {
      if (sound.note.name === 'x') {
        sound.noteLength.length = 1/16;
      }
      var length = sound.noteLength.length;
      if (sound.noteLength.dotted) {
        length *= 1.5;
      }
      if (sound.noteLength.staccato) {
        //length -= 0.1;
      }
      if (!sound.hasOwnProperty('ui')) {
        sound.ui = {};
      }
      sound.fret = $scope.bass.stringFret(sound.string, sound.note);
      // sound.ui.width = 100*(length*$scope.section.timeSignature.bottom*4)+'%';
      sound.ui.width = 100*(length*4);
    };

    $scope.onDragEnter = function(evt, $data) {
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
        box
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
      dragNote = data.data;
      if (dragNote.source === 'fretboard') {
        if (dragNote.note.label.length > 1 && e.clientX > e.target.offsetLeft+e.target.clientWidth/2) {
          dragNote.note.name = dragNote.note.label[1];
        } else {
          dragNote.note.name = dragNote.note.label[0];
        }
        dragNote.note.code = dragNote.note.name+dragNote.note.octave;
        delete dragNote.source;
        // update transfer data
        var transferDataText = angular.toJson(data);
        e.dataTransfer.setData('text', transferDataText);

        // $scope.dropNote.width = e.target.clientWidth*(25/16);
        $scope.dropNote.width = -1;
      } else {
        $scope.dropNote.width = e.target.clientWidth;
      }
      if (!dragNote.noteLength) {
        return;
      }

      if (!e.ctrlKey) {
        dragElement = angular.element(e.target);
        setTimeout(function() {
          dragElement.addClass('drag-element');
        }, 100);
        // $scope.bassData[dragNote.beat*4+dragNote.subbeat][dragNote.string.index].note = {};
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

    $scope.dropValidation = function(subbeat, $data) {
      if (subbeat.note.name && subbeat.noteLength) {
        return false;
      }
      if ($data.note.name === 'x') {
        return true;
      }
      var fret = $scope.bass.stringFret(subbeat.string, $data.note);
      return fret !== -1;
    };

    $scope.setSubbeatMenu = function(subbeat) {
      console.log('setSubbeatMenu');
      $scope.menu.subbeat = subbeat;
    };

    $scope.openSubbeatMenu = function(evt, subbeat) {
      var box = evt.target.getBoundingClientRect();
      $scope.menu.element.css('left', box.left+'px');
      $scope.menu.element.css('top', 32+box.top+'px');

      $mdMenu.hide().then(function() {
        $scope.menu.subbeat = subbeat;
        $timeout(function() {
          $scope.menu.open(evt);
        });
      });
    };

    $scope.nextNoteLabel = function(subbeat) {
      console.log(subbeat.note.name);
      var index = $scope.notesLabels.indexOf(subbeat.note.name)+1;
      index = index % $scope.notesLabels.length;
      subbeat.note.name = $scope.notesLabels[index];
    };

    $scope.playSound = function(sound) {
      audioPlayer.playSound(sound);
    };
  }

})();
