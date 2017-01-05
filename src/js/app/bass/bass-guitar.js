(function() {
  'use strict';

  angular
    .module('bd.app')
    .value('Bass', Bass)
    .value('Notes', Notes)
    .value('Piano', Piano)


  var sharpNotes = 'C C♯ D D♯ E F F♯ G G♯ A A♯ B'.split(' ');
  var flatNotes = 'C D♭ D E♭ E F G♭ G A♭ A B♭ B'.split(' ');

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

  Notes.sharpNotes = sharpNotes;
  Notes.flatNotes = flatNotes;
  Notes.toSharp = function(name) {
    var index = flatNotes.indexOf(name);
    if (index !== -1) {
      return sharpNotes[index];
    }
    return name;
  }

  Notes.toFlat = function(name) {
    var index = sharpNotes.indexOf(name);
    if (index !== -1) {
      return flatNotes[index];
    }
    return name;
  }

  Notes.codeTovalue = function(code) {
    var name = code.substring(0, code.length-1);
    var octave = parseInt(code.charAt(code.length-1));
    var scale = name.endsWith('♯')? Notes.sharpNotes : Notes.flatNotes;
    var scaleIndex = scale.indexOf(name);
    return scaleIndex + octave * 12;
  }

  Notes.noteValue = function(note) {
    var scale = note.name.endsWith('♯')? Notes.sharpNotes : Notes.flatNotes;
    var scaleIndex = scale.indexOf(note.name);
    return scaleIndex + note.octave * 12;
  }

  var bassNotes = new Notes('B0', 'C5');
  var bassStrings = [
    {
      label: 'B',
      octave: 0,
      index: 0,
      noteIndex: bassNotes.list.indexOf(bassNotes.map['B0'])
    }, {
      label: 'E',
      octave: 1,
      index: 1,
      noteIndex: bassNotes.list.indexOf(bassNotes.map['E1'])
    }, {
      label: 'A',
      octave: 1,
      index: 2,
      noteIndex: bassNotes.list.indexOf(bassNotes.map['A1'])
    }, {
      label: 'D',
      octave: 2,
      index: 3,
      noteIndex: bassNotes.list.indexOf(bassNotes.map['D2'])
    }, {
      label: 'G',
      octave: 2,
      index: 4,
      noteIndex: bassNotes.list.indexOf(bassNotes.map['G2'])
    }, {
      label: 'C',
      octave: 3,
      index: 5,
      noteIndex: bassNotes.list.indexOf(bassNotes.map['C3'])
    }
  ];
  bassStrings.forEach(function(string) {
    string.toJSON = function() {
      return this.label;
    };
  });

  function Bass(config) {
    this.notes = bassNotes;
    this.setLayout(config.strings);
  }

  Bass.prototype.setLayout = function(layout) {
    console.log('setLayout');
    this.layout = layout;
    var first = 'BEADGC'.indexOf(this.layout[0]);
    this.strings = bassStrings.slice(first, first+this.layout.length);
    this.strings.forEach(function(string) {
      if (!string.notes) {
        string.notes = bassNotes.list.slice(string.noteIndex, string.noteIndex+25);
      }
      this.strings[string.label] = string;
    }, this);
  };

  Bass.prototype.stringFret = function(string, note) {
    var noteName = note.name + note.octave;
    var index = bassNotes.list.indexOf(bassNotes.map[noteName]);
    var fret = index - this.strings[string].noteIndex;
    return (fret >= 0 && fret <= 24)? fret : -1;
  };

  Bass.prototype.stringByName = function(name) {
    return this.strings.find(function(string) {
      return string.label === name;
    });
  }

  function Piano(config) {
    this.range = config.range;
    this.notes = new Notes(this.range[0], this.range[1]);
    this.preset = config.preset || 'acoustic';
  }

  Piano.prototype.stringIndex = function(note) {
    // console.log('stringIndex')
    if (note) {
      var code = note.name + note.octave;
      return this.notes.list.indexOf(this.notes.map[code]);
    }
  }

  Piano.prototype.setRange = function(start, end) {
    this.range[0] = start;
    this.range[1] = end;
    this.notes = new Notes(this.range[0], this.range[1]);
  }

})();