(function() {
  'use strict';

  angular
    .module('bd.app')
    .directive('bdFretDiagram', fretDiagram)
    .factory('fretboardViewer', fretboardViewer);


  function fretDiagram(workspace) {
    return {
      scope: {
        config: '=bdFretDiagram',
      },
      controller: function($scope) {
        var config = $scope.config;
        var instrument = workspace.section.tracks[config.track].instrument;
        console.log(config)

        function labelToNote(noteCode) {
          var data = noteCode.split(":");
          var string = data[0];
          var noteName = data[1];
          var note = instrument.notes.map[noteName];
          var fret = instrument.strings[string].notes.indexOf(note);
          return {
            id: noteCode,
            string: string,
            label: noteName,
            fret: instrument.strings[string].notes.indexOf(note),
            index: instrument.notes.list.indexOf(note)
          }
        }
        $scope.instrument = instrument;
        $scope.rootNote = labelToNote(config.root);
        $scope.notes = config.notes.map(labelToNote);
        $scope.noteById = {};
        $scope.notes.forEach(function(note) {
          note.interval = note.index - $scope.rootNote.index;
          $scope.noteById[note.id] = note;
        });
        console.log($scope.noteById)

        var frets = [$scope.rootNote].concat($scope.notes)
          .map(function(note) {
            return note.fret;
          });
        var minFret = Math.min.apply(null, frets);
        var maxFret = Math.max.apply(null, frets);

        minFret = 0; maxFret = 19;
        $scope.frets = [];
        for (var i = minFret; i <= maxFret; i++) {
          $scope.frets.push(i);
        }
      },
      templateUrl: 'views/fret_diagram.html'
    };
  }

  function fretboardViewer(context, workspace, audioPlayer) {

    var diagramElem;
    function FretboardViewer() {
      
      audioPlayer._bassSoundScheduled = function(trackId, sound) {
        var currentTime = context.currentTime;
        function delayTime(time) {
          return parseInt((time - currentTime) * 1000);
        }
        if (trackId === workspace.track.id) {
          if (!diagramElem) {
            diagramElem = document.querySelector('.diagram-container');
          }
          if (sound.type === 'single') {
            // console.log('HIGHLIGHT NOTE');
            var id = '#'+sound.string+'_'+sound.note.name+sound.note.octave;
            var elem = diagramElem.querySelector(id);
            setTimeout(function(elem) {
              elem.classList.add('highlight');
            }, delayTime(sound.startTime), elem);
            setTimeout(function(elem) {
              elem.classList.remove('highlight');
            }, delayTime(sound.startTime+sound.duration)-5, elem);
          } else if (sound.type === 'sequence') {
            // console.log('HIGHLIGHT SLIDE');
            // console.log(sound)
            var prevElems = [];
            sound.notes.forEach(function(subsound, index) {
              var query;
              if (subsound.note.name) {
                query = '#'+sound.string+'_'+subsound.note.name+subsound.note.octave;
              } else {
                query = '.string.{0} .fret-{1} label'.format(sound.string, subsound.note.fret);
              }
              var elems = diagramElem.querySelectorAll(query);
              setTimeout(function(elems, prevElems) {
                prevElems.forEach(function(elem) {
                  elem.classList.remove('highlight');
                });
                // for (var elem of elems) {
                //   elem.classList.remove('active');
                // }
                elems.forEach(function(elem) {
                  elem.classList.add('highlight');
                });
              }, delayTime(subsound.startTime), elems, prevElems);
              prevElems = elems;
            });
            var lastNote = sound.notes[sound.notes.length-1];
            setTimeout(function() {
              prevElems.forEach(function(elem) {
                elem.classList.remove('highlight');
              });
            }, delayTime(lastNote.startTime+lastNote.duration)-5);
          } /*else if (sound.type === 'ghost') {
            var stringElem = diagramElem.querySelector('.string.'+sound.string);
            setTimeout(function() {
              stringElem.classList.add('ghost');
            }, delayTime(sound.startTime));
            setTimeout(function() {
              stringElem.classList.remove('ghost');
            }, delayTime(sound.startTime+sound.duration));
          }*/
        }
      }
    }

    FretboardViewer.prototype.clearDiagram = function() {
      if (!diagramElem) return;
      var elems = diagramElem.querySelectorAll('.active');
      elems.forEach(function(elem) {
        elem.classList.remove('active');
      });
      var rootElem = diagramElem.querySelector('.root');
      if (rootElem) {
        rootElem.classList.remove('root');
      }
    }

    FretboardViewer.prototype.setChord = function(root, start, end) {
      this.clearDiagram();
      var rootElem = diagramElem.querySelector('#'+root.replace(":", "_"));
      rootElem.classList.add('root');

      var sBar = start[0];
      var sBeat = start[1];
      var sSubbeat = start[2] || 1;
      var eBar = end[0];
      var eBeat = end[1];
      var eSubbeat = end[2] || 4;

      var beat = workspace.trackSection.beat(sBar, sBeat);
      var sounds;
      if (sBar === eBar && sBeat === eBeat) {
        sounds = workspace.trackSection.beatSounds(beat)
          .filter(function(sound) {
            return sound.subbeat >= sSubbeat && sound.subbeat <= eSubbeat;
          });
      } else {
        sounds = workspace.trackSection.beatSounds(beat)
          .filter(function(sound) {
            return sound.subbeat >= sSubbeat;
          });

        while (true) {
          beat = workspace.trackSection.nextBeat(beat);
          if (beat.bar === eBar && beat.beat == eBeat) {
            break;
          }
          Array.prototype.push.apply(sounds, workspace.trackSection.beatSounds(beat));
        }
        Array.prototype.push.apply(
          sounds,
          workspace.trackSection.beatSounds(beat)
            .filter(function(sound) {
              return sound.subbeat <= eSubbeat;
            })
        );
      }
      // console.log(sounds);
      var ids = new Set();
      sounds.forEach(function(beatSound) {
        var sound = beatSound.sound;
        if (sound.note.type !== 'ghost') {
          var id = '#'+sound.string+'_'+sound.note.name+sound.note.octave;
          ids.add(id);
        }
        if (sound.note.type === 'slide') {
          var id = '#'+sound.string+'_'+sound.note.slide.endNote.name+sound.note.slide.endNote.octave;
          ids.add(id);
        }
      });
      var query = Array.from(ids).join(',');
      diagramElem.querySelectorAll(query).forEach(function(elem) {
        elem.classList.add('active');
      });
    };

    FretboardViewer.prototype.beatSync = function(evt) {
      if (!workspace.section.meta || !workspace.section.meta.chords) {
        return;
      }
      var chord = workspace.section.meta.chords.find(function(chord) {
        return chord.start[0] === evt.bar && chord.start[1] === evt.beat;
      });
      if (chord) {
        var subbeat = chord.start[2] || 1;
        // console.log(evt);
        // TODO: get beat subdivision properly
        var time = (evt.startTime - evt.eventTime) + (subbeat-1)*evt.duration/4;
        setTimeout(function() {
          this.setChord(chord.root, chord.start, chord.end);
        }.bind(this), parseInt(time*1000)-10);
      }
    };

    /*
    workspace.diagram = function(root, start, end) {
      var containerElem = angular.element(document.querySelector('.diagram-container'));
      containerElem.children().remove();

      var sBar = start[0];
      var sBeat = start[1];
      var sSubbeat = start[2] || 1;
      var eBar = end[0];
      var eBeat = end[1];
      var eSubbeat = end[2] || 4;

      var beat = workspace.trackSection.beat(sBar, sBeat);
      var sounds;
      if (sBar === eBar && sBeat === eBeat) {
        sounds = workspace.trackSection.beatSounds(beat)
          .filter(function(sound) {
            return sound.subbeat >= sSubbeat && sound.subbeat <= eSubbeat;
          });
      } else {
        sounds = workspace.trackSection.beatSounds(beat)
          .filter(function(sound) {
            return sound.subbeat >= sSubbeat;
          });

        while (true) {
          beat = workspace.trackSection.nextBeat(beat);
          if (beat.bar === eBar && beat.beat == eBeat) {
            break;
          }
          Array.prototype.push.apply(sounds, workspace.trackSection.beatSounds(beat));
        }
        Array.prototype.push.apply(
          sounds,
          workspace.trackSection.beatSounds(beat)
            .filter(function(sound) {
              return sound.subbeat <= eSubbeat;
            })
        );
      }
      // console.log(sounds);
      var notes = new Set();
      sounds.forEach(function(beatSound) {
        var sound = beatSound.sound;
        if (sound.note.type !== 'ghost') {
          var note = sound.string+':'+sound.note.name+sound.note.octave;
          notes.add(note);
        }
      });
      var data = {
        track: workspace.track.id,
        root: root,
        notes: Array.from(notes)
      }
      var dataStr = JSON.stringify(data).replace(/"/g, "'");
      var html = '<div bd-fret-diagram="{0}"></div>'.format(dataStr);
      var ngElem = angular.element(html);
      $compile(ngElem)($scope);
      containerElem.append(ngElem);
    }
    */

    return new FretboardViewer();
  }
})();
