(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('BassBeatController', BassBeatController)
    .controller('BassFormController', BassFormController)
    .factory('bassSoundForm', bassSoundForm)
    .run(function(workspace, basicHandler) {
      workspace.selected = basicHandler.selected;
    });


  function BassBeatController($scope, $timeout, basicHandler, dragHandler, resizeHandler, bassSoundForm) {

    $scope.selectGrid = basicHandler.selectGrid.bind(basicHandler);
    $scope.keyPressed = basicHandler.keyPressed.bind(basicHandler);

    /*****  Drag And Drop  ******/
    $scope.dropValidation = dragHandler.dropValidation;
    $scope.onDragEnter = dragHandler.onDragEnter;
    $scope.onDragLeave = dragHandler.onDragLeave;
    $scope.onDrop = function(evt, dragData, dropGrid) {
      dragHandler.onDrop(evt, dragData, dropGrid);

      $timeout(function() {
        basicHandler.selectGrid(evt, dropGrid, true);
      });
    };

    /*****  Resize operation  ******/
    $scope.onResizeStart = resizeHandler.onResizeStart;
    $scope.onResize = resizeHandler.onResize;
    $scope.onResizeEnd = resizeHandler.onResizeEnd;

    $scope.openBassSoundMenu = bassSoundForm.open;
  }


  function BassFormController($scope, sound, string, bass, audioPlayer) {

    $scope.nextNote = function(note) {
      var index = -1;
      if (note.code) {
        index = this.inlineStringNotes.findIndex(function(n) {
          return n.code === note.code;
        });
      }
      var nextNote = this.inlineStringNotes[index+1];
      if (nextNote) {
        note.code = nextNote.code;
        $scope.soundPitchChanged(note);
      }
    };

    $scope.prevNote = function(note) {
      var code = note.code || this.inlineStringNotes[0].code;
      var index = this.inlineStringNotes.findIndex(function(n) {
        return note.code === n.code;
      });
      if (index > 0) {
        var nextNote = this.inlineStringNotes[index-1];
        note.code = nextNote.code;
        this.soundPitchChanged(note);
      }
    };

    $scope.soundPitchChanged = function(note) {
      var noteData = this.inlineStringNotes.find(function(n) {
        return note.code === n.code;
      });
      angular.extend(note, noteData);

      var nextSound = this.sound.next;
      while (nextSound) {
        nextSound = nextSound.ref;
        if (nextSound.style === 'hammer' || nextSound.style === 'pull') {
          break;
        }
        var prevSound = nextSound.prev.ref;
        var prevEndNote = prevSound.note.type === 'slide'? prevSound.note.slide.endNote : prevSound.note;

        nextSound.note.name = prevEndNote.name;
        nextSound.note.octave = prevEndNote.octave;
        nextSound.note.code = prevEndNote.code;
        nextSound.note.fret = prevEndNote.fret;

        nextSound = nextSound.next;
      }
    };

    $scope.soundLengthChanged = function(sound) {
      var beatLength = sound.noteLength.length;
      if (sound.noteLength.dotted) {
        beatLength *= 1.5;
      }
      sound.noteLength.beatLength = beatLength;
    };

    $scope.updateSlide = function() {
      var endindex = this.sound.note.fret+this.sound.note.slide;
      if (endindex < 0) {
        this.sound.note.slide += -(endindex);
      } else if (endindex > 24) {
        this.sound.note.slide -= endindex-24;
      }
      this.slideEndNote = this.stringNotes[this.sound.note.fret+this.sound.note.slide];
    }

    $scope.playSound = function() {
      var sound = this.sound;
      while (sound.prev) {
        sound = sound.prev.ref;
      }
      audioPlayer.playBassSample(workspace.track, sound);
    };

    if (!sound.volume) {
      sound.volume = 0.8;
    }

    var fretsStringNotes = [];
    var inlineStringNotes = [];
    string.notes.forEach(function(note, fret) {
      var notes = note.label.map(function(label) {
        return {
          code: label+note.octave,
          name: label,
          octave: note.octave,
          fret: fret
        };
      });

      Array.prototype.push.apply(inlineStringNotes, notes);
      fretsStringNotes.push(notes);
    });
    $scope.fretsStringNotes = fretsStringNotes;
    $scope.inlineStringNotes = inlineStringNotes;
    $scope.sound = sound;
    $scope.bass = bass;
  }

  function bassSoundForm($mdPanel, basicHandler) {

    var panelRef;
    var appContextMenuHandler;

    // Special right-click handler to close current form menu and open
    // of another sound form properties (if clicked at it's position)
    var customContextMenuHandler = function(event) {

      panelRef.close();
      var elem = document.elementFromPoint(event.clientX, event.clientY);
      // when backdrop element is still attached to DOM, 'deactivate' it
      // temporary and check element under it 
      if (elem.className.indexOf('md-panel-outer-wrapper') !== -1) {
        var backdrop = elem;
        backdrop.style.pointerEvents = 'none';
        elem = document.elementFromPoint(event.clientX, event.clientY);
        backdrop.style.pointerEvents = 'auto';
      }
      
      var scope = angular.element(elem).scope();
      if (scope.grid && scope.grid.sound.note) {
        menu.open({target: elem}, scope.grid, scope.bass);
      }

      return false;
    };

    var menu = {
      open: function(evt, grid, bass, options) {
        if (!appContextMenuHandler || window.oncontextmenu !== customContextMenuHandler) {
          appContextMenuHandler = window.oncontextmenu;
        }
        basicHandler.selectGrid(evt, grid);

        var position = $mdPanel.newPanelPosition()
          .relativeTo(evt.target)
          .addPanelPosition($mdPanel.xPosition.ALIGN_START, $mdPanel.yPosition.BELOW)
          .addPanelPosition($mdPanel.xPosition.ALIGN_END, $mdPanel.yPosition.BELOW)
          .addPanelPosition($mdPanel.xPosition.ALIGN_START, $mdPanel.yPosition.ABOVE)
          .addPanelPosition($mdPanel.xPosition.ALIGN_END, $mdPanel.yPosition.ABOVE)
          .withOffsetY('4px');
          
        var animation = $mdPanel.newPanelAnimation()
          .withAnimation($mdPanel.animation.FADE);

        var panelConfig = {
          clickOutsideToClose: true,
          escapeToClose: true,
          zIndex: 250
        }
        if (options) {
          panelConfig = angular.extend(panelConfig, options);
        }
        panelRef = $mdPanel.create(
          angular.extend(panelConfig, {
            templateUrl: 'views/bass_sound_form.html',
            targetEvent: evt,
            position: position,
            animation: animation,
            controller: 'BassFormController',
            locals: {
              sound: grid.sound,
              string: grid.string,
              bass: bass
            },
            onRemoving: function() {
              window.oncontextmenu = appContextMenuHandler;
            },
            onOpenComplete: function() {
              window.oncontextmenu = customContextMenuHandler;
            }
          })
        );

        panelRef.open();
        return panelRef;
      }
    }

    return menu;
  }

})();