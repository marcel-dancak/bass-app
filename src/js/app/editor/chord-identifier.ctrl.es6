(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('ChordIdentifier', ChordIdentifier)


const CommonChords = [
  "+add#9",
  "11",
  // "11b9",
  // "13",
  // "13#11",
  // "13#9",
  // "13#9#11",
  // "13b5",
  // "13b9",
  // "13b9#11",
  // "13no5",
  // "13sus4",
  "4",
  "5",
  "64",
  // "69#11",
  "7",
  // "7#11",
  // "7#11b13",
  // "7#5",
  // "7#5#9",
  // "7#5b9",
  // "7#5b9#11",
  // "7#5sus4",
  // "7#9",
  // "7#9#11",
  // "7#9#11b13",
  // "7#9b13",
  "7add6",
  // "7b13",
  "7b5",
  "7b6",
  "7b9",
  "7b9#11",
  "7b9#9",
  "7b9b13",
  // "7b9b13#11",
  "7no5",
  "7sus4",
  "7sus4b9",
  // "7sus4b9b13",
  "9",
  "9#11",
  "9#11b13",
  "9#5",
  "9#5#11",
  "9b13",
  "9b5",
  "9no5",
  "9sus4",
  "M",
  "M#5",
  "M#5add9",
  "M13",
  // "M13#11",
  "M6",
  // "M6#11",
  "M69",
  // "M69#11",
  "M7#11",
  "M7#5",
  "M7#5sus4",
  // "M7#9#11",
  // "M7add13",
  "M7b5",
  "M7b6",
  "M7b9",
  "M7sus4",
  "M9",
  // "M9#11",
  // "M9#5",
  // "M9#5sus4",
  "M9b5",
  "M9sus4",
  "Madd9",
  "Maddb9",
  "Maj7",
  "Mb5",
  "Mb6",
  "Msus2",
  "Msus4",
  "m",
  "m#5",
  "m11",
  "m11A 5",
  "m11b5",
  "m13",
  "m6",
  "m69",
  "m7",
  "m7#5",
  "m7add11",
  "m7b5",
  "m9",
  "m9#5",
  "m9b5",
  "mM9",
  "mM9b6",
  "mMaj7",
  "mMaj7b6",
  "madd4",
  "madd9",
  "mb6M7",
  "mb6b9",
  "o",
  "o7",
  "o7M7",
  "oM7",
  "sus24"
];

const excluded = ['4', '5', '64']
const ChordTypes = Tonal.Chord.names().filter(ch => !excluded.includes(ch));

  function asciiNote(note) {
    return note.replace('♯', '#').replace('♭', 'b');
  }

  function prettyNote(note) {
    return note.replace('#', '♯').replace('b', '♭');
  }

  function noteToNum(note) {
    return note.octave * 12 + Tonal.Note.chroma(asciiNote(note.name));
  }

  function createSounds(notes, octave) {
    let prevNoteIndex = 0;
    return notes.map(note => {
      const noteIndex = Tonal.Note.names().indexOf(asciiNote(note));
      // console.log(note, prevNoteIndex, noteIndex);
      if (noteIndex < prevNoteIndex) {
        octave++;
      }
      prevNoteIndex = noteIndex;
      return {
        note: {
          name: prettyNote(note),
          octave: octave,
          length: 1/2
        },
        string: prettyNote(note) + octave,
        volume: 0.85
      };
    });
  }

  function ChordIdentifier($scope, audioPlayer, selector) {
    let sounds;
    let matches;
    $scope.rootOctave = 3;
    $scope.filter = {
      strict: true,
      text: ''
    };

    function findBySounds(inputSounds) {
      const _soundsTags = new Set();
      sounds = JSON.parse(JSON.stringify(inputSounds))
        .filter(sound => sound.volume > 0)
        .filter(sound => {
          const key = noteToNum(sound.note);
          const included = _soundsTags.has(key);
          _soundsTags.add(key);
          return !included;
        });

      sounds.forEach(sound => {
        sound.volume = 0.85;
        delete sound.next;
        delete sound.prev;
      });

      const notes = Array.from(sounds
        .filter(sound => sound.volume > 0)
        .reduce((values, sound) => {
          return values.add(sound.note.name);
        }, new Set())
      );

      const notesCodes = notes.map(note => Tonal.Note.chroma(asciiNote(note)));
      matches = [];
      'A A# B C C# D D# E F F# G G#'.split(' ').forEach(root => {
        ChordTypes.forEach(type => {
          const chord = root + type;
          const list = Tonal.Chord.notes(chord).map(n => Tonal.Note.chroma(n));
          // list.length === notes.length && 
          if (notesCodes.every(code => list.includes(code))) {
            const match = {
              name: chord,
              label: prettyNote(chord),
              matches: list.map(code => notesCodes.includes(code)),
              notes: Tonal.Chord.notes(chord).map(n => prettyNote(Tonal.Note.simplify(n)))
            };
            if (root.includes('#')) {
              const sharpChord = Tonal.Note.enharmonic(root) + type;
              match.enharmonic = {
                name: sharpChord,
                label: prettyNote(sharpChord),
                notes: Tonal.Chord.notes(sharpChord).map(n => prettyNote(Tonal.Note.simplify(n)))
              };
            }
            matches.push(match);
          }
        })
      });
      // matches = matches.filter(item => item.notes.length === notes.length);
      // matches.sort((a, b) => a.root - b.root);
      matches.sort((a, b) => a.matches.filter(m => m === false).length - b.matches.filter(m => m === false).length);

      $scope.sounds = sounds
        .sort((a, b) => noteToNum(a.note) - noteToNum(b.note))
        .map(s => s.note.name);
      $scope.rootOctave = sounds[0].note.octave;
      $scope.input = $scope.sounds.join(' ');
      $scope.applyFilter();
    }

    $scope.applyFilter = function() {
      if ($scope.filter.strict) {
        $scope.results = matches.filter(chord => chord.matches.every(m => m));
      } else {
        $scope.results = matches;
      }
      if ($scope.filter.text) {
        console.log('FILTER:', $scope.filter.text)
        $scope.results = $scope.results
          // .filter(chord => chord.name.search($scope.filter.text) !== -1);
          .filter(chord => chord.name.search($scope.filter.text) !== -1 || (chord.enharmonic && chord.enharmonic.name.search($scope.filter.text) !== -1));
      }
    }

    $scope.updateSelection = function() {
      console.log('updateSelection')
      findBySounds(selector.all);
    };

    $scope.inputUpdated = function(evt) {
      console.log(evt)
      if (evt.key === 'Enter') {
        const s = createSounds($scope.input.split(' '), $scope.rootOctave);
        console.log(s);
        findBySounds(s);
      }
    };

    $scope.playInputSounds = function() {
      console.log(sounds.map(s => s.string));
      audioPlayer.playPianoSample(workspace.track, sounds);
    };

    $scope.playChord = function(chord) {
      const notes = Tonal.Chord.notes(chord).map(n => prettyNote(Tonal.Note.simplify(n).replace(/\d+/, '')));
      const chordSounds = createSounds(notes, $scope.rootOctave);
      console.log(chordSounds.map(s => s.string));
      audioPlayer.playPianoSample(workspace.track, chordSounds);
    }

    findBySounds(selector.all);
  }
})();