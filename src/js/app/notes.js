(function() {
  'use strict';

  angular
    .module('bd.app')
    .value('Notes', Notes)
    .value('Bass', Bass)
    .value('Drums', createDrums());


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

  var bassNotes = new Notes('B0', 'G4');
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
    }
  ];
  bassStrings.forEach(function(string) {
    string.toJSON = function() {
      return this.label;
    };
  });

  function Bass(config) {
    var first = config.strings === 'BEADG'? 0 : 1;
    this.strings = bassStrings.slice(first);
    this.strings.forEach(function(string) {
      string.notes = bassNotes.list.slice(string.noteIndex, string.noteIndex+25);
      this.strings[string.label] = string;
    }, this);
  }

  Bass.prototype.stringFret = function(string, note) {
    var noteName = note.name + note.octave;
    var index = bassNotes.list.indexOf(bassNotes.map[noteName]);
    var fret = index - this.strings[string.label].noteIndex;
    return (fret >= 0 && fret <= 24)? fret : -1;
  };

  function createDrums() {
    return {
      Standard: [
        {
          name: 'tom1',
          label: 'Small Rack Tom',
          filename: 'sounds/drums/acoustic2/small-rack-tom',
          duration: 0.66
        }, {
          name: 'tom2',
          label: 'Big Rack Tom',
          filename: 'sounds/drums/acoustic2/big-rack-tom',
          duration: 0.9
        }, {
          name: 'tom3',
          label: 'Floor Tom',
          filename: 'sounds/drums/acoustic2/floor-tom',
          duration: 1.09
        }, {
          name: 'crash',
          label: 'Crash',
          filename: 'sounds/drums/acoustic2/crash',
          duration: 3.85
        }, {
          name: 'hihat-open',
          label: 'Hi-Hat Open',
          filename: 'sounds/drums/acoustic2/hi-hat-open',
          duration: 1.56
        }, {
          name: 'hihat',
          label: 'Hi-Hat Closed',
          filename: 'sounds/drums/acoustic2/hi-hat-closed',
          duration: 0.13
        }, {
          name: 'snare',
          label: 'Snare',
          filename: 'sounds/drums/acoustic2/snare',
          duration: 0.46
        }, {
          name: 'kick',
          label: 'Kick',
          filename: 'sounds/drums/acoustic2/kick',
          duration: 0.44
        }
      ],
      Bongo: [
        {
          name: 'tom1',
          label: 'Bongo',
          filename: 'sounds/drums/bongo/bongo_001d',
          duration: 0.5
        }, {
          name: 'tom2',
          label: 'Bongo',
          filename: 'sounds/drums/bongo/bongo_002c',
          duration: 0.5
        }, {
          name: 'tom3',
          label: 'Bongo',
          filename: 'sounds/drums/bongo/bongo_005d',
          duration: 0.5
        }, {
          name: 'snare',
          label: 'Bongo',
          filename: 'sounds/drums/bongo/bongo_006r',
          duration: 0.5
        }, {
          name: 'kick',
          label: 'Bongo',
          filename: 'sounds/drums/bongo/bongo_004c',
          duration: 0.5
        }
      ]
    };
    // drums = [
    //   {
    //     name: 'tom1',
    //     label: 'Tom 1',
    //     filename: 'sounds/drums/acoustic-kit/tom1',
    //     duration: 0.41
    //   }, {
    //     name: 'tom2',
    //     label: 'Tom 2',
    //     filename: 'sounds/drums/acoustic-kit/tom2',
    //     duration: 0.6
    //   }, {
    //     name: 'tom3',
    //     label: 'Tom 3',
    //     filename: 'sounds/drums/acoustic-kit/tom3',
    //     duration: 1.0
    //   }, {
    //     name: 'hihat',
    //     label: 'Hi-Hat',
    //     filename: 'sounds/drums/acoustic-kit/hihat',
    //     duration: 0.25
    //   }, {
    //     name: 'snare',
    //     label: 'Snare',
    //     filename: 'sounds/drums/acoustic-kit/snare',
    //     duration: 0.36
    //   }, {
    //     name: 'kick',
    //     label: 'Kick',
    //     filename: 'sounds/drums/acoustic-kit/kick',
    //     duration: 0.27
    //   }
    // ];
  }

})();