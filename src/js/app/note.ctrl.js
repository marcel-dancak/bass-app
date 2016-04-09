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
      maxWidth: window.innerWidth,
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
      subbeat.note = {};
      // subbeat.length = 0;
      if (subbeat.width > 1) {
        var count = subbeat.width-1;
        var subbeat = subbeat;
        while(count--) {
          subbeat = subbeat.bar.nextSubbeat(subbeat);
          subbeat.width = 1;
        }
      }
      subbeat.width = 1;
      $scope.updateNote(subbeat);
      $scope.selected.subbeat = null;
    };

    $scope.updateNoteLength = function(subbeat) {
      
    };

    var notesWidths;
    var widthToLength = {};
    var closestWidth;
    $scope.onResizeStart = function(subbeat, info) {
      // console.log('onResizeStart');
      // console.log(info);
      var length = subbeat.noteLength.dotted? subbeat.noteLength.length*1.5 : subbeat.noteLength.length;
      var subbeatWidth = (info.width+2)/length;
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
      $scope.dropNote.left = containerElem.offsetParent.offsetLeft;
      $scope.dropNote.top = containerElem.offsetTop;
      $scope.$apply();
    };

    $scope.onResizeEnd = function(subbeat, info) {
      info.element.css('width', '');
      angular.extend(subbeat.noteLength, widthToLength[closestWidth]);
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

    $scope.onDrop = function($event, $data, subbeat, bar) {
      // console.log('onDrop');
      // console.log($event);
      if (angular.isDefined($data.beat) && $event.dataTransfer.dropEffect === "move") {
        console.log('MOVE');
        //bar[$data.beat*4+$data.subbeat][$data.string.index].note = {};
        //bar[$data.beat*4+$data.subbeat][$data.string.index].noteLength = {};
        $scope.clearNote(bar[$data.beat*4+$data.subbeat][$data.string.index]);
      }
      //subbeat.note = $data.note;
      delete $data.beat;
      delete $data.subbeat;
      delete $data.string;
      console.log($data);
      angular.extend(subbeat, $data);
      console.log('find fret of '+subbeat.note.name+' od string '+subbeat.string.index);

      subbeat.fret = $scope.bass.stringFret(subbeat.string, subbeat.note);
      console.log(subbeat.string);
      audioPlayer.fetchSoundResources(subbeat);
      // subbeat.note = $data.note;
      $scope.selected.subbeat = subbeat;
      $scope.dropNote.visible = false;
    };

    $scope.updateNote = function(subbeat) {
      // $scope.$root.$broadcast('subbeatChanged', subbeat);
      if (subbeat.note.name === 'x') {
        subbeat.noteLength.length = 1/16;
      }
      if (!subbeat.$form) {
        subbeat.$form = {};
      }
      var range = $scope.bass.noteStringOctaves(subbeat.note.name, subbeat.string);
      subbeat.$form.minOctave = range[0];
      subbeat.$form.maxOctave = range[range.length-1];
      console.log(subbeat.$form.minOctave);
    };

    $scope.onDragEnter = function(evt, $data) {
      var target = evt.target || evt.originalTarget;
      if (target.tagName === 'BUTTON') {
        // target = target.parentElement.parentElement;
        target = target.parentElement;
      }
      $timeout(function() {
        $scope.dropNote.visible = true;
        $scope.dropNote.left = target.offsetParent.offsetLeft;
        $scope.dropNote.top = target.offsetTop;
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

        $scope.dropNote.width = e.target.clientWidth*(25/16);
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
      console.log($scope.menu.element);
      var box = evt.target.getBoundingClientRect();
      $scope.menu.element.css('left', box.left+'px');
      $scope.menu.element.css('top', 32+box.top+'px');

      $scope.updateNote(subbeat);
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
