(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('NoteController', NoteController);

  function NoteController($scope, $timeout, $mdMenu) {
    console.log('NOTE CONTROLLER');

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
      note: $scope.bassData[0][0].note
    };

    $timeout(function() {
      $scope.menu.element = angular.element(document.getElementById('subbeat-menu'));
    }, 100);

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
    };

    $scope.updateNoteLength = function(subbeat) {
      
    };

    var notesWidths;
    var widthToLength = {};
    var closestWidth;
    $scope.onResizeStart = function(subbeat, info) {
      // console.log('onResizeStart');
      // console.log(info);
      var length = subbeat.note.dotted? subbeat.note.length*1.5 : subbeat.note.length;
      var subbeatWidth = info.width/length;
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
        var width = length*subbeatWidth;
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
      angular.extend(subbeat.note, widthToLength[closestWidth]);
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
      if ($event.dataTransfer.dropEffect === "move") {
        bar[$data.beat*4+$data.subbeat][$data.string.index].note = {};
      }
      subbeat.note = $data.note;
    };

    $scope.updateNote = function(subbeat) {
      // $scope.$root.$broadcast('subbeatChanged', subbeat);
      if (subbeat.note.name === 'x') {
        subbeat.note.length = 1/16;
      }
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

    $scope.$on('ANGULAR_DRAG_START', function(evt, e, channel, data) {
      dragNote = data.data;
      if (!dragNote.note.length) {
        return;
      }
      $scope.dropNote.width = e.target.clientWidth;
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
      if (subbeat.note.name && subbeat.note.length) {
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
      $scope.menu.note = subbeat.note;
    };

    $scope.openSubbeatMenu = function(evt, subbeat) {
      $mdMenu.hide().then(function() {
        $scope.menu.subbeat = subbeat;
        $scope.menu.note = subbeat.note;
        $scope.menu.open(evt);
        var box = evt.target.getBoundingClientRect();
        $scope.menu.element.css('left', box.left+'px');
        $scope.menu.element.css('top', 32+box.top+'px');
      });
    };
  }

})();
