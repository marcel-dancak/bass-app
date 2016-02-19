(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('AppController', AppController)
    .value('context', new AudioContext());


  function AppController($scope, $timeout, $mdDialog, context, audioPlayer, audioVisualiser, NotesModel) {
    var analyser;
    setTimeout(function() {
      analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      analyser.connect(context.destination);
      audioPlayer.initialize(analyser);

      audioVisualiser.initialize(
        document.getElementById("canvas"),
        analyser
      );
    }, 200);

    function analyze() {
      audioVisualiser.draw();
      if ($scope.playing) {
        requestAnimationFrame(analyze);
      }
    }

    function stringNotes(notes, note, frets) {
      var index = notes.list.indexOf(notes.map[note]);
      return notes.list.slice(index, index+frets);
    }
    
    var bassNotes = new NotesModel('B0', 'G4');
    $scope.bass = {
      notes: bassNotes,
      strings: [
        {
          label: 'E',
          octave: 1,
          index: 0,
          noteIndex: bassNotes.list.indexOf(bassNotes.map['E1'])
        }, {
          label: 'A',
          octave: 1,
          index: 1,
          noteIndex: bassNotes.list.indexOf(bassNotes.map['A1'])
        }, {
          label: 'D',
          octave: 2,
          index: 2,
          noteIndex: bassNotes.list.indexOf(bassNotes.map['D2'])
        }, {
          label: 'G',
          octave: 2,
          index: 3,
          noteIndex: bassNotes.list.indexOf(bassNotes.map['G2'])
        }
      ].reverse(),
      playingStyles: {
        finger: {
          name: 'finger',
          label: 'Finger',
          noteLabel: function(subbeat) {
            if (subbeat.note.name) {
              return "{0}<sub>{1}</sub>".format(
                subbeat.note.name,
                subbeat.note.octave || ''
              );
            }
          }
        },
        slap: {
          name: 'slap',
          label: 'Slap',
          noteLabel: function(subbeat) {
            if (subbeat.note.name) {
              return "<sup>(Slap)</sup> {0}<sub>{1}</sub>".format(
                subbeat.note.name,
                subbeat.note.octave || ''
              );
            }
          }
        },
        pop: {
          name: 'pop',
          label: 'Pop',
          noteLabel: function(subbeat) {
            if (subbeat.note.name) {
              return "<sup>(Pop)</sup> {0}<sub>{1}</sub>".format(
                subbeat.note.name,
                subbeat.note.octave || ''
              );
            }
          }
        },
        tap: {
          name: 'tap',
          label: 'Tap',
          noteLabel: function(subbeat) {
            if (subbeat.note.name) {
              return "<sup>(Tap)</sup> {0}<sub>{1}</sub>".format(
                subbeat.note.name,
                subbeat.note.octave || ''
              );
            }
          }
        },
        hammer: {
          name: 'hammer-on',
          label: 'Hammer on',
          noteLabel: function(subbeat) {
            if (subbeat.note.name) {
              return '<span class="hammer-top">)</span>\
                <span class="hammer-bottom">h</span>{0}<sub>{1}</sub>'
                .format(subbeat.note.name, subbeat.note.octave||'');
            }
          }
        },
        pull: {
          name: 'pull-of',
          label: 'Pull of',
          noteLabel: function(subbeat) {
            if (subbeat.note.name) {
              return '<span class="pull-top">p</span>\
                <span class="pull-bottom">)</span>{0}<sub>{1}</sub>'
                .format(subbeat.note.name, subbeat.note.octave||'');
            }
          }
        }
      }
    };
    // stringNotes($scope.bass.notes, 'E1', 24)
    console.log($scope.bass);

    var timeSignature = {
      top: 4,
      bottom: 4
    };

    var beatTemplate = [
      {
        name: '',
      }, {
        name: 'i',
      }, {
        name: 'and'
      }, {
        name: 'a'
      }
    ];
    /*
    var subbeatsCount = timeSignature.bottom / 16;
    for (var subbeat=1; beat < subbeatsCount; subbeat++) {
      subbeats.push({});
    }*/
    var bar = {
      timeSignature: timeSignature,
      subbeats: [],
      nextSubbeat: function(subbeat) {
        //TODO: subdivision count
        return this.subbeats[subbeat._index+1];
      },
      prevSubbeat: function(subbeat) {
        return this.subbeats[subbeat._index-1];
      }
    };
    for (var i=1; i <= 12; i++) {
      var subbeats = angular.copy(beatTemplate);
      subbeats[0].name = '{0}'.format(i);
      subbeats.forEach(function(subbeat, index) {
        subbeat._index = (i-1)*subbeats.length+index;
        subbeat.beat = i;
        subbeat.index = index+1;
        subbeat.bar = bar;
        subbeat.width = 1;
        subbeat.note = {
          volume: 0.75
        };
      });
      bar.subbeats = bar.subbeats.concat(subbeats);
    }

    var subbeat = {
      note: {
        style: 'finger', // finger, slap, pop, tap
        name: 'A', // 'x' - ghost note
        octave: 2,
        length: 1/8,
        staccato: false, // staccato or legato
        string: 1 // string index 
      }
    }
    /**
     * test data
     */
    angular.extend(
      bar.subbeats[0],
      {
        note: {
          volume: 0.75,
          style: 'finger',
          name: 'C',
          octave: 2,
          length: 1/16
        },
      }
    );
    angular.extend(
      bar.subbeats[1],
      {
        note: {
          volume: 0.75,
          style: 'hammer',
          name: 'D',
          octave: 2,
          length: 1/16
        },
      }
    );
    angular.extend(
      bar.subbeats[3],
      {
        note: {
          volume: 0.75,
          style: 'finger',
          name: 'x'
        },
      }
    );
    angular.extend(
      bar.subbeats[5],
      {
        note: {
          volume: 0.75,
          style: 'slap',
          name: 'G',
          octave: 2,
          length: 1/8
        },
      }
    );
    angular.extend(
      bar.subbeats[7],
      {
        note: {
          volume: 0.75,
          style: 'pull',
          name: 'F',
          octave: 2,
          length: 1/16
        },
      }
    );

    $scope.bar = bar;
    $scope.play = function() {
      var elem = document.getElementById('time-marker');
      var ngElem = angular.element(elem);
      Velocity(
        elem, {
          left: ngElem.parent()[0].offsetWidth,
        }, {
          duration: 4000,
          easing: "linear",
          begin: function() {
            ngElem.css('left', 0+'px');
          }
        }
      );
      $scope.playing = true;
      audioVisualiser.reset();
      audioPlayer.play(bar, 120);
      setTimeout(analyze, 120);
    };

    $scope.stop = function() {
      $scope.playing = false;
      audioPlayer.stop();
    };

    var openedNote;
    var noteForm;
    $scope.showNoteDialog = function(model, evt) {
      console.log('showNoteDialog');
      var parent = angular.element(angular.element(evt.target).parent().children()[2]);

      if (noteForm) {
        noteForm.addClass('closed');
        if (noteForm[0] === parent[0]) {
          noteForm = null;
          return;
        }
      }
      parent.removeClass('closed');
      openedNote = model;
      noteForm = parent;
    };

  }
})();
