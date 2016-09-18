(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('BassBeatController', BassBeatController)
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

    $scope.openBassSoundMenu = bassSoundForm.openMenu;
  }

  function bassSoundForm($timeout, $mdMenu, audioPlayer, $mdCompiler, basicHandler) {

    var menu = {
      element: null,
      grid: null, // set when opened,
      sound: null,
      open: null,
      nextNote: function(note) {
        var index = -1;
        if (note.code) {
          index = this.inlineStringNotes.findIndex(function(n) {
            return n.code === note.code;
          });
        }
        var nextNote = this.inlineStringNotes[index+1];
        if (nextNote) {
          note.code = nextNote.code;
          this.soundPitchChanged(note);
        }
      },
      prevNote: function(note) {
        var code = note.code || this.inlineStringNotes[0].code;
        var index = this.inlineStringNotes.findIndex(function(n) {
          return note.code === n.code;
        });
        if (index > 0) {
          var nextNote = this.inlineStringNotes[index-1];
          note.code = nextNote.code;
          this.soundPitchChanged(note);
        }
      },
      soundPitchChanged: function(note) {
        var noteData = this.inlineStringNotes.find(function(n) {
          return note.code === n.code;
        })
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
      },
      updateSlide: function() {
        var endindex = this.sound.note.fret+this.sound.note.slide;
        if (endindex < 0) {
          this.sound.note.slide += -(endindex);
        } else if (endindex > 24) {
          this.sound.note.slide -= endindex-24;
        }
        this.slideEndNote = this.stringNotes[this.sound.note.fret+this.sound.note.slide];
      },
      initializeMenu: function(evt, grid) {
        var box = evt.target.getBoundingClientRect();
        menu.element.css('left', (evt.clientX-20)+'px');
        menu.element.css('top', 32+box.top+'px');

        // grid.sound.string = grid.string;
        if (!grid.sound.volume) {
          grid.sound.volume = 0.8;
        }
        menu.grid = grid;
        menu.sound = grid.sound;

        var fretsStringNotes = [];
        var inlineStringNotes = [];
        grid.string.notes.forEach(function(note, fret) {
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
        // console.log(inlineStringNotes);
        // console.log(fretsStringNotes);
        menu.fretsStringNotes = fretsStringNotes;
        menu.inlineStringNotes = inlineStringNotes;
        basicHandler.selectGrid(evt, grid);
      },
      openMenu: function(evt, grid) {
        if (menu.open) {
          menu.initializeMenu(evt, grid);
          return menu.open(evt);
        }
        var scope = this.$root.$new(true);
        scope.menu = menu;
        scope.bass = this.bass; // TODO: find a better way
        $mdCompiler.compile({
          templateUrl: 'views/bass_sound_form.html'
        }).then(function(compileData) {
          //attach controller & scope to element
          menu.element = compileData.link(scope);
          document.body.appendChild(menu.element[0]);
          menu.initializeMenu(evt, grid);
          $timeout(function() {
            menu.open(evt);
          });
        });
      },
      playSound: function() {
        var sound = menu.sound;
        while (sound.prev) {
          sound = sound.prev.ref;
        }
        audioPlayer.playBassSample(workspace.track, sound);
      }
    };

    return menu;
  }

})();