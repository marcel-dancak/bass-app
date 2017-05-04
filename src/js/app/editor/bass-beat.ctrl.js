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


  function BassBeatController($scope, basicHandler, bassDragHandler, bassResizeHandler, bassSoundForm) {
    $scope.selectSound = basicHandler.selectSound.bind(basicHandler);
    $scope.keyPressed = basicHandler.keyPressed.bind(basicHandler);
    $scope.dragHandler = bassDragHandler;
    $scope.resizeHandler = bassResizeHandler;
    $scope.bassForm = bassSoundForm;
  }


  function BassFormController($scope, $timeout, Note, sound, string, bass, audioPlayer, basicHandler, mdPanelRef) {
    $scope.Note = Note;
    $scope.keyPressed = function(evt) {
      basicHandler.keyPressed(evt);
      if (evt.keyCode === 46) {
        mdPanelRef.close();
      }
    };

    $scope.soundStyleChanged = basicHandler.soundStyleChanged.bind(basicHandler);

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
      basicHandler.soundLabelChanged(this.sound);
    };

    $scope.soundLengthChanged = function(sound) {
      sound.end = sound.start + workspace.track.soundDuration(sound);
    };

    $scope.noteTypeChanged = function() {
      basicHandler.noteTypeChanged(this.sound);
    }

    $scope.playSound = function() {
      var sound = this.sound;
      while (sound.prev) {
        sound = workspace.trackSection.prevSound(sound);
      }
      audioPlayer.playBassSample(workspace.trackSection, sound);
    };

    $scope.updateLineEditor = function() {
      $timeout(function() {
        var svgElem = mdPanelRef.panelEl[0].querySelector('.line-editor svg');
        var pointsElems = mdPanelRef.panelEl[0].querySelectorAll('.line-editor .rzslider');
        var firstPointElem = pointsElems[0];
        var lastPointElem = pointsElems[pointsElems.length-1];
        var left = firstPointElem.offsetLeft;
        var width = lastPointElem.offsetLeft - left;
        svgElem.style.left = left + 8;
        svgElem.style.width = width;
      });
    };
    if (sound.note && sound.note.type === 'bend') {
      $scope.updateLineEditor();
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

  function bassSoundForm($mdUtil, $mdPanel, basicHandler, swiperControl) {

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
      if (scope.sound && scope.sound.note) {
        menu.open({target: elem}, scope.sound, scope.bass);
      }

      return false;
    };

    var menu = {
      openNew: function(evt, beat, bass) {
        var sound = basicHandler.createSound(evt, beat);
        $mdUtil.nextTick(function() {
          this.open({target: swiperControl.getSoundElem(sound)}, sound, bass);
        }.bind(this));
      },
      open: function(evt, sound, bass, options) {
        if (!appContextMenuHandler || window.oncontextmenu !== customContextMenuHandler) {
          appContextMenuHandler = window.oncontextmenu;
        }
        basicHandler.selectSound(evt, sound);

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
        // compute code property
        if (sound.note) {
          sound.note.code = sound.note.name + sound.note.octave;
          if (sound.endNote) {
            sound.endNote.code = sound.endNote.name + sound.endNote.octave;
          }
        }
        panelRef = $mdPanel.create(
          angular.extend(panelConfig, {
            templateUrl: 'views/editor/bass_sound_form.html',
            targetEvent: evt,
            position: position,
            animation: animation,
            controller: 'BassFormController',
            locals: {
              sound: sound,
              string: workspace.track.instrument.strings[sound.string],
              bass: bass
            },
            onRemoving: function() {
              // remove computed code value
              delete sound.note.code;
              if (sound.endNote) {
                delete sound.endNote.code;
              }
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