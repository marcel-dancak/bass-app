(function() {
  'use strict';

  angular
    .module('bd.app')
    .factory('NotesModel', NotesModel);

  function NotesModel() {

    function Notes(firstNote, lastNote) {
      this.scaleNotes = [
        {
          label: ['C'],
        }, {
          label: ['C♯', 'D♭'],
        }, {
          label: ['D'],
        }, {
          label: ['D♯', 'E♭'],
        }, {
          label: ['E'],
        }, {
          label: ['F'],
        }, {
          label: ['F♯', 'G♭'],
        }, {
          label: ['G'],
        }, {
          label: ['G♯', 'A♭'],
        }, {
          label: ['A'],
        }, {
          label: ['A♯', 'B♭'],
        }, {
          label: ['B'],
        }
      ];
      this._noteIndexMap = {
        'C': 0,
        'C♯': 1,
        'D♭': 1,
        'D': 2,
        'D♯': 3,
        'E♭': 3,
        'E': 4,
        'F': 5,
        'F♯': 6,
        'G♭': 6,
        'G': 7,
        'G♯': 8,
        'A♭': 8,
        'A': 9,
        'A♯': 10,
        'B♭': 10,
        'B': 11
      };
      var lastIndex = this._noteIndexMap[lastNote.substr(0, lastNote.length-1)];
      var lastOctave = parseInt(lastNote.charAt(lastNote.length-1));

      var index = this._noteIndexMap[firstNote.substr(0, firstNote.length-1)];
      var octave = parseInt(firstNote.charAt(firstNote.length-1));
      var notes = [];
      this.map = {};
      var notesOctaves = {};
      while (true) {
        if (index >= 12) {
          index = 0;
          octave++;
        }
        var note = angular.copy(this.scaleNotes[index]);
        note.octave = octave;
        notes.push(note);
        note.label.forEach(function(label) {
          this.map['{0}{1}'.format(label, octave)] = note;
          if (!notesOctaves.hasOwnProperty(label)) {
            notesOctaves[label] = [octave];
          } else {
            notesOctaves[label].push(octave);
          }
        }, this);
        if (octave === lastOctave && index === lastIndex) {
          break;
        }
        index++;
      }

      this.notesOctaves = notesOctaves;
      this.list = notes;
    }

    Notes.prototype.get = function() {};

    return Notes;
  }

})();