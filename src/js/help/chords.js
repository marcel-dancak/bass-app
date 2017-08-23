(function() {
  'use strict';

  angular
    .module('bd.help')
    .controller('ChordsController', ChordsController);


var fixture = {
    // "name": "Verse",
    "timeSignature": {
        "top": 4,
        "bottom": 4
    },
    "length": 2,
    // "bpm": 120,
    "meta": {
        "chords": [
            {
                "root": "C",
                "start": [
                    1,
                    1,
                    1
                ],
                "string": "A",
                "type": "7",
                "octave": 2
            },
            {
                "start": [
                    1,
                    4,
                    1
                ],
                "string": "E",
                "type": "-"
            },
            {
                "root": "A♭",
                "start": [
                    2,
                    1,
                    1
                ],
                "string": "E",
                "octave": 1
            },
            {
                "root": "F",
                "start": [
                    2,
                    3,
                    1
                ],
                "string": "E",
                "octave": 1,
                "type": "min7"
            }
        ]
    },
    "tracks": {
        "bass_0": [
            {
                "bar": 1,
                "beat": 1,
                "subdivision": 4,
                "data": [
                    {
                        "subbeat": 1,
                        "sound": {
                            "style": "finger",
                            "note": {
                                "type": "regular",
                                "name": "C",
                                "octave": 2,
                                "fret": 3
                            },
                            "noteLength": {
                                "length": 0.25,
                                "beatLength": 0.25,
                                "dotted": false
                            },
                            "volume": 0.75,
                            "string": "A"
                        }
                    }
                ]
            },
            {
                "bar": 1,
                "beat": 2,
                "subdivision": 4,
                "data": [
                    {
                        "subbeat": 3,
                        "sound": {
                            "volume": 0.75,
                            "string": "G",
                            "style": "finger",
                            "note": {
                                "type": "regular",
                                "name": "E♭",
                                "octave": 3,
                                "fret": 8
                            },
                            "noteLength": {
                                "length": 0.0625,
                                "beatLength": 0.0625,
                                "dotted": false
                            }
                        }
                    },
                    {
                        "subbeat": 4,
                        "sound": {
                            "volume": 0.75,
                            "string": "G",
                            "style": "finger",
                            "note": {
                                "type": "regular",
                                "name": "D",
                                "octave": 3,
                                "fret": 7
                            },
                            "noteLength": {
                                "length": 0.0625,
                                "beatLength": 0.0625,
                                "dotted": false
                            }
                        }
                    }
                ]
            },
            {
                "bar": 1,
                "beat": 3,
                "subdivision": 4,
                "data": [
                    {
                        "subbeat": 2,
                        "sound": {
                            "style": "finger",
                            "note": {
                                "type": "regular",
                                "name": "C",
                                "octave": 3,
                                "fret": 10
                            },
                            "noteLength": {
                                "length": 0.0625,
                                "beatLength": 0.0625,
                                "dotted": false
                            },
                            "volume": 0.75,
                            "string": "D"
                        }
                    },
                    {
                        "subbeat": 3,
                        "sound": {
                            "style": "finger",
                            "note": {
                                "type": "regular",
                                "name": "B♭",
                                "octave": 2,
                                "fret": 8
                            },
                            "noteLength": {
                                "length": 0.125,
                                "beatLength": 0.125,
                                "dotted": false,
                                "staccato": true
                            },
                            "volume": 0.75,
                            "string": "D"
                        }
                    }
                ]
            },
            {
                "bar": 1,
                "beat": 4,
                "subdivision": 4,
                "data": [
                    {
                        "subbeat": 3,
                        "sound": {
                            "style": "finger",
                            "note": {
                                "type": "ghost",
                                "name": "D♯"
                            },
                            "noteLength": {
                                "length": 0.0625,
                                "beatLength": 0.0625
                            },
                            "volume": 0.75,
                            "string": "E"
                        }
                    },
                    {
                        "subbeat": 4,
                        "sound": {
                            "style": "finger",
                            "note": {
                                "type": "regular",
                                "name": "G",
                                "octave": 1,
                                "fret": 3
                            },
                            "noteLength": {
                                "length": 0.0625,
                                "beatLength": 0.0625,
                                "dotted": false
                            },
                            "volume": 0.75,
                            "string": "E"
                        }
                    }
                ]
            },
            {
                "bar": 2,
                "beat": 1,
                "subdivision": 4,
                "data": [
                    {
                        "subbeat": 1,
                        "sound": {
                            "style": "finger",
                            "note": {
                                "type": "regular",
                                "name": "A♭",
                                "octave": 1,
                                "fret": 4
                            },
                            "noteLength": {
                                "length": 0.125,
                                "beatLength": 0.125,
                                "staccato": true,
                                "dotted": false
                            },
                            "volume": 0.75,
                            "string": "E"
                        }
                    },
                    {
                        "subbeat": 3,
                        "sound": {
                            "style": "finger",
                            "note": {
                                "type": "regular",
                                "name": "C",
                                "octave": 2,
                                "fret": 3
                            },
                            "noteLength": {
                                "length": 0.0625,
                                "beatLength": 0.0625,
                                "dotted": false
                            },
                            "volume": 0.75,
                            "string": "A"
                        }
                    },
                    {
                        "subbeat": 4,
                        "sound": {
                            "style": "finger",
                            "note": {
                                "type": "regular",
                                "name": "A♭",
                                "octave": 1,
                                "fret": 4
                            },
                            "noteLength": {
                                "length": 0.0625,
                                "beatLength": 0.0625,
                                "dotted": false
                            },
                            "volume": 0.75,
                            "string": "E"
                        }
                    }
                ]
            },
            {
                "bar": 2,
                "beat": 2,
                "subdivision": 4,
                "data": [
                    {
                        "subbeat": 2,
                        "sound": {
                            "style": "finger",
                            "note": {
                                "type": "regular",
                                "name": "G",
                                "octave": 1,
                                "fret": 3
                            },
                            "noteLength": {
                                "length": 0.0625,
                                "beatLength": 0.0625,
                                "dotted": false
                            },
                            "volume": 0.75,
                            "string": "E"
                        }
                    },
                    {
                        "subbeat": 3,
                        "sound": {
                            "volume": 0.75,
                            "string": "E",
                            "style": "finger",
                            "note": {
                                "type": "regular",
                                "name": "G",
                                "octave": 1,
                                "fret": 3
                            },
                            "noteLength": {
                                "length": 0.125,
                                "beatLength": 0.125,
                                "staccato": true
                            }
                        }
                    }
                ]
            },
            {
                "bar": 2,
                "beat": 3,
                "subdivision": 4,
                "data": [
                    {
                        "subbeat": 1,
                        "sound": {
                            "style": "finger",
                            "note": {
                                "type": "regular",
                                "name": "F",
                                "octave": 1,
                                "fret": 1
                            },
                            "noteLength": {
                                "length": 0.125,
                                "beatLength": 0.125
                            },
                            "volume": 0.75,
                            "string": "E"
                        }
                    },
                    {
                        "subbeat": 3,
                        "sound": {
                            "style": "finger",
                            "note": {
                                "type": "regular",
                                "name": "F",
                                "octave": 2,
                                "fret": 3
                            },
                            "noteLength": {
                                "length": 0.125,
                                "beatLength": 0.125,
                                "staccato": true
                            },
                            "volume": 0.75,
                            "string": "D"
                        }
                    }
                ]
            },
            {
                "bar": 2,
                "beat": 4,
                "subdivision": 4,
                "data": [
                    {
                        "subbeat": 1,
                        "sound": {
                            "style": "finger",
                            "note": {
                                "type": "slide",
                                "name": "B♭",
                                "octave": 1,
                                "fret": 1,
                                "slide": {
                                    "endNote": {
                                        "name": "E♭",
                                        "octave": 2,
                                        "fret": 6
                                    },
                                    "start": 0.07,
                                    "end": 0.65
                                }
                            },
                            "noteLength": {
                                "length": 0.125,
                                "beatLength": 0.125
                            },
                            "volume": 0.75,
                            "string": "A"
                        }
                    },
                    {
                        "subbeat": 3,
                        "sound": {
                            "style": "finger",
                            "note": {
                                "type": "regular",
                                "name": "E♭",
                                "octave": 3,
                                "fret": 8
                            },
                            "noteLength": {
                                "length": 0.125,
                                "beatLength": 0.125,
                                "staccato": true
                            },
                            "volume": 0.75,
                            "string": "G"
                        }
                    }
                ]
            }
        ]
    }
}

  function ChordsController($scope, $element, $mdUtil, Bass, TrackSection, slidesCompiler, fretboardViewer, Note) {

    var section = angular.copy(fixture);
    section.beatLabels = function(beat) {
      return [0,1,2,3,4,5,6,7,8,9,10,11,12];
    }
    var data = section.tracks.bass_0;
    section.tracks.bass_0 = new TrackSection(section, data);

    $scope.project = {
      tracks: [{
        id: 'bass_0',
        name: 'Bass',
        type: 'bass',
        strings: 'EADG',
        instrument: new Bass({strings: 'EADG'})
      }]
    };
    $scope.workspace = {
      section: section,
      track: $scope.project.tracks[0]
    };
    $scope.settings = {
      fretboard: {
        size: 12
      }
    };
    $scope.barLabels = {
      3: ['trip', 'let'],
      4: ['e', 'and', 'a']
    };
    $scope.Note = Note;

    var playlist = [section];
    var position = {
      section: 0,
      bar: 1,
      beat: 1
    };

    $mdUtil.nextTick(function() {
      var slide = slidesCompiler.generateSlide($scope, playlist, position, 5, 'bass_0', {});
      var containerEl = $element[0].querySelector('.bass-sheet');
      containerEl.appendChild(slide.elem[0]);

      // wait for fretboard's angular compiation and then highlight notes 
      $mdUtil.nextTick(function() {
        fretboardViewer.activate($element[0]);
        fretboardViewer.setChord(section, 'bass_0', section.meta.chords[0]);
      });

    });
  }

})();