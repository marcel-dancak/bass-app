(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('AppController', AppController)
    .value('context', new AudioContext());

  function AppController($scope, $timeout, $mdDialog, context, audioPlayer, audioVisualiser, NotesModel) {
    var analyser = context.createAnalyser();
    analyser.fftSize = 4096;
    analyser.connect(context.destination);
    audioPlayer.bass.audio.connect(analyser);
    audioPlayer.drums.audio.connect(context.destination);
    audioVisualiser.initialize(analyser);

    $scope.player = {
      playing: false,
      bpm: 60,
      bass: audioPlayer.bass,
      drums: audioPlayer.drums
    };

    var bassNotes = new NotesModel('B0', 'G4');
    $scope.bass = {
      notes: bassNotes,
      noteStringOctaves: function(noteName, string) {
        var octaves = [];
        bassNotes.list.slice(string.noteIndex, string.noteIndex+24).filter(function(note) {
          if (note.label.indexOf(noteName) !== -1) {
            octaves.push(note.octave);
          }
        });
        return octaves;
      },
      stringFret: function(string, note) {
        var noteName = note.name + note.octave;
        // console.log(noteName+' on '+string.label);
        var index = bassNotes.list.indexOf(bassNotes.map[noteName]);
        var fret = index - string.noteIndex;
        return (fret >= 0 && fret <= 24)? fret : -1;
      },
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
    $scope.drums = [
      {
        name: 'tom1',
        label: 'Tom 1',
        filename: 'sounds/drums/acoustic-kit/tom1',
        duration: 0.41
      }, {
        name: 'tom2',
        label: 'Tom 2',
        filename: 'sounds/drums/acoustic-kit/tom2',
        duration: 0.6
      }, {
        name: 'tom3',
        label: 'Tom 3',
        filename: 'sounds/drums/acoustic-kit/tom3',
        duration: 1.0
      }, {
        name: 'hihat',
        label: 'Hi-Hat',
        filename: 'sounds/drums/acoustic-kit/hihat',
        duration: 0.25
      }, {
        name: 'snare',
        label: 'Snare',
        filename: 'sounds/drums/acoustic-kit/snare',
        duration: 0.36
      }, {
        name: 'kick',
        label: 'Kick',
        filename: 'sounds/drums/acoustic-kit/kick',
        duration: 0.27
      }
    ];

    function newBar(barIndex) {

      var labels = [];
      var bassData = [];
      var drumsData = [];
      var bassBeats = [];
      var drumsBeats = [];
      var beat, subbeat;
      for (beat = 0; beat < 13; beat++) {
        var bassSubbeats = [];
        var drumsBeat = {
          subdivision: 4,
          bar: barIndex,
          beat: beat+1,
          subbeats: []
        };
        for (subbeat = 0; subbeat < 4; subbeat++) {
          var bassSubbeatData = new Array($scope.bass.strings);
          $scope.bass.strings.forEach(function(string) {
            bassSubbeatData[string.index] = {
              string: string,
              index: barIndex,
              beat: beat,
              subbeat: subbeat,
              note: {
                style: 'finger',
                length: 1/8,
                volume: 0.75
              },
              width: 1
            };
          });
          var drumSubbeatGrid = {};
          $scope.drums.forEach(function(drum) {
            drumSubbeatGrid[drum.name] = {
              // bar: barIndex,
              // beat: beat+1,
              // subbeat: subbeat+1,
              drum: drum,
              volume: 0.0
            }
          });
          bassData.push(bassSubbeatData);
          // drumsData.push(drumSubbeatGrid);
          drumsBeat.subbeats.push(drumSubbeatGrid);
        }
        drumsBeats.push(drumsBeat);
        labels.push({
          id: barIndex+'_'+beat,
          bar: barIndex,
          subbeats: [beat, 'i', 'and', 'a']
        });
      }
      return {
        labels: labels,
        bass: bassData,
        drumsBeats: drumsBeats,

        nextSubbeat: function(subbeat) {
          //TODO: subdivision count
          return this.bassData[subbeat._index+1];
        },
        prevSubbeat: function(subbeat) {
          return this.bassData[subbeat._index-1];
        }
      };
    }

    $scope.section = {
      timeSignature: {
        top: 4,
        bottom: 4
      },
      bars: [],
      beatsPerSlide: 2,
      slidesPerView: 5,
      length: 2
    };

    $scope.slides = {
      bars: [],
      bass: [],
      drums: []
    };

    function updateSlides() {
      var timeSignature = $scope.section.timeSignature;
      $scope.slides.bars = [];
      $scope.slides.bass = [];
      $scope.slides.drums = [];

      var bar = 1;
      var beat = 1;
      var barData = $scope.section.bars[bar-1];
      if (!angular.isDefined(barData)) {
        barData = newBar(bar);
        $scope.section.bars.push(barData);
      }
      
      var i = 0;
      while (bar <= $scope.section.length) {
        
        if (!$scope.slides.bass[i]) {
          var start = (beat-1)*4;
          var bassData = barData.bass.slice(start, start+4);
          var drumsBeat = barData.drumsBeats[beat-1];
          var beatId = bassData[0][0].index+'_'+bassData[0][0].beat;
          bassData.id = beatId;
          drumsBeat.id = beatId;
          $scope.slides.bass.push(bassData);
          $scope.slides.drums.push(drumsBeat);
          console.log(drumsBeat);
          $scope.slides.bars.push(barData.labels[beat]);
        }

        if (beat === timeSignature.top) {
          bar++;
          var barData = $scope.section.bars[bar-1];
          if (!angular.isDefined(barData)) {
            barData = newBar(bar);
            $scope.section.bars.push(barData);
          }
          beat = 1;
        } else {
          beat++;
        }
        i++;
      }
    }

    $scope.renderingBar = function(index) {
      console.log('Rendering Bar: '+index);
    };

    $scope.sectionConfigChanged = function() {
      if ($scope.section.length > 0 && $scope.section.length < 20 &&
        $scope.section.timeSignature.top > 1 && $scope.section.timeSignature.top < 13) {
        updateSlides();
        $timeout(function() {
          $scope.barSwiper.init();
          $scope.bassSwiper.init();
          $scope.drumsSwiper.init();
        });
      }
    };

    $scope.beatsPerSlideChenged = function() {
      $scope.barSwiper.params.slidesPerGroup = $scope.section.beatsPerSlide;
      $scope.bassSwiper.params.slidesPerGroup = $scope.section.beatsPerSlide;
      $scope.drumsSwiper.params.slidesPerGroup = $scope.section.beatsPerSlide;
      $scope.barSwiper.updateSlidesSize();
      $scope.bassSwiper.updateSlidesSize();
      $scope.drumsSwiper.updateSlidesSize();
    };

    $scope.slidesPerViewChanged = function() {
      $scope.barSwiper.params.slidesPerView = $scope.section.slidesPerView;
      $scope.bassSwiper.params.slidesPerView = $scope.section.slidesPerView;
      $scope.drumsSwiper.params.slidesPerView = $scope.section.slidesPerView;

      $scope.barSwiper.updateSlidesSize();
      $scope.bassSwiper.updateSlidesSize();
      $scope.drumsSwiper.updateSlidesSize();
    };


    updateSlides();
    $scope.newSection = function() {
      $scope.section.bars.forEach(function(bar) {
        //console.log(bar.bass);
        bar.bass.forEach(function(subbeat) {
          subbeat.forEach(function(sound) {
            sound.note = {};
            sound.noteLength = {
              length: 1/16
            };
          });
        });
      });
    };

    $scope.$watch('player.bpm', function(value) {
      if (audioPlayer.playing) {
        audioPlayer.stop();
        audioPlayer.setBpm($scope.player.bpm);
        audioPlayer.play(
          {
            timeSignature: $scope.section.timeSignature,
            bars: $scope.section.bars,
            length: $scope.section.length
          },
          beatSync
        );
      }
    });

    var timelineElem = document.getElementById('time-marker');
    timelineElem.style.visibility = "hidden";
    function timelineRedraw() {
      if ($scope.barSlideElement) {
        var elapsed = context.currentTime - $scope.barSlideStartTime;
        var beatTime = 60 / $scope.player.bpm;
        var fraction = elapsed / beatTime;

        var barBox = $scope.barSlideElement.getBoundingClientRect();
        if ($scope.player.playing) {
          timelineElem.style.left = barBox.left+fraction*barBox.width+'px';
          requestAnimationFrame(timelineRedraw);
        } else {
          timelineElem.style.left = 0;
          timelineElem.style.visibility = "hidden";
        }
      }
    }
    function beatSync(barIndex, beat, bpm) {
      audioVisualiser.beatSync(barIndex, beat, bpm);
      var slide = (barIndex-1)*$scope.section.timeSignature.top+beat-1;
      $scope.barSwiper.slideTo(slide, 300, false);
      var barSlideElement = $scope.barSwiper.$('.swiper-slide')[slide];
      $scope.barSlideStartTime = context.currentTime;
      if (!$scope.barSlideElement) {
        $scope.barSlideElement = barSlideElement;
        timelineRedraw();
      } else {
        $scope.barSlideElement = barSlideElement;
      }
    }

    $scope.play = function() {
      $scope.player.playing = true;
      audioPlayer.setBpm($scope.player.bpm);
      audioVisualiser.enabled = true;
      audioVisualiser.beat = null;
      $scope.barSlideElement = null;
      audioPlayer.play(
        {
          timeSignature: $scope.section.timeSignature,
          bars: $scope.section.bars,
          length: $scope.section.length
        },
        beatSync
      );
      timelineElem.style.visibility = "visible";
    };

    $scope.stop = function() {
      $scope.player.playing = false;
      audioPlayer.stop();
      audioVisualiser.enabled = false;
    };

    $scope.toggleVolumeMute = function(instrument) {
      if (!instrument.muted) {
        instrument._volume = instrument.audio.gain.value;
        instrument.audio.gain.value = 0;
      } else {
        instrument.audio.gain.value = instrument._volume;
      }
      instrument.muted = !instrument.muted;
    };

    $scope.playBassSound = function(bassSound) {
      var sound = angular.extend({
        style: 'finger',
        noteLength: {
          length: 1/4
        },
        volume: 0.75
      }, bassSound);
      audioPlayer.playSound(sound);
    };


    $scope.saveSection = function() {
      var section = $scope.section;
      console.log('saving: '+section.name);
      console.log(section.length);
      if (section.name) {
        var storageKey = 'v8.section.'+section.name;
        console.log(storageKey);
        var sectionStorageBeats = [];
        var bar, barIndex, beatIndex;
        for (barIndex = 0; barIndex < section.length; barIndex++) {
          bar = section.bars[barIndex];
          for (beatIndex = 0; beatIndex < section.timeSignature.top ; beatIndex++) {
            var drumsBeat = bar.drumsBeats[beatIndex];

            var dumsBeatSounds = [];
            drumsBeat.subbeats.forEach(function(subbeat, subbeatIndex) {
              var drumName, drumSound;
              for (drumName in subbeat) {
                drumSound = subbeat[drumName];
                if (drumSound.volume > 0) {
                  console.log('bar {0} beat {1} subbeat {2}'.format(barIndex+1, beatIndex+1, subbeatIndex+1));
                  dumsBeatSounds.push({
                    subbeat: subbeatIndex+1,
                    volume: drumSound.volume,
                    drum: drumName
                  });
                }
              }
            });
            sectionStorageBeats.push({
              bar: barIndex + 1,
              beat: beatIndex + 1,
              drums: {
                subdivision: drumsBeat.subdivision,
                sounds: dumsBeatSounds
              }
            });
          }
        }
        var data = {
          timeSignature: section.timeSignature,
          length: section.length,
          beats: sectionStorageBeats
        }
        console.log(JSON.stringify(data));
        localStorage.setItem(storageKey, JSON.stringify(data));
      }
    };

    function loadSavedSectionsNames() {
      var storageKeyPrefix = 'v8.section.';
      var sectionsNames = [];
      var i;
      for (i=0; i<localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key.startsWith(storageKeyPrefix)) {
          sectionsNames.push(key.substring(storageKeyPrefix.length));
        }
      }
      return sectionsNames;
    }

    $scope.project = {
      sections: loadSavedSectionsNames(),
      selectedSection: null
    };

    $scope.loadSection = function(sectionName) {
      var storageKey = 'v8.section.'+sectionName;
      var sectionData = JSON.parse(localStorage.getItem(storageKey));
      console.log(sectionData);
      var sectionConfigChanged = $scope.section.timeSignature.top !== sectionData.timeSignature.top;

      $scope.section.timeSignature = sectionData.timeSignature;

      // clear current section data
      $scope.section.bars.forEach(function(bar, barIndex) {
        var beatIndex;
        for (beatIndex = 0; beatIndex < sectionData.timeSignature.top; beatIndex++) {
          var drumsBeat = bar.drumsBeats[beatIndex];
          drumsBeat.subbeats.forEach(function(subbeat) {
            var drumName, drumSound;
              for (drumName in subbeat) {
                if (!drumName.startsWith('$$')) {
                  drumSound = subbeat[drumName]
                  drumSound.volume = 0;
                }
              }
          });
        }
      });

      // override loading section data
      sectionData.beats.forEach(function(beat) {
        beat.drums.sounds.forEach(function(drumSound) {
          console.log(drumSound);
          $scope.section.bars[beat.bar-1].drumsBeats[beat.beat-1].subbeats[drumSound.subbeat-1][drumSound.drum].volume = drumSound.volume;
        });
      });


      if (sectionConfigChanged) {
        $scope.sectionConfigChanged();
      }
    }

    /*
    console.log('-------------');
    angular.extend($scope.section.bars[0].bass[0][1], {
      style: 'finger',
      volume: 0.75,
      note: {
        name: 'C',
        octave: 2,
        code: 'C2'
      },
      noteLength: {
        length: 1/8
      }
    });
    $scope.newBar = function() {
      $scope.bass.present = {
        name: 'New',
        data: newBar()
      };
      $scope.bass.presents.push($scope.bass.present);
      $scope.bassData = $scope.bass.present.data;
    };

    function deleteObsoletePresents() {
      var actualPresentsKeys = $scope.bass.presents.map(function(present) {
        return 'v5.bass.present.'+present.name;
      });
      var i;
      for (i=0; i<localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key.startsWith('v5.bass.present.') && actualPresentsKeys.indexOf(key) === -1) {
          console.log('delete: '+key);
          localStorage.removeItem(key);
          break;
        }
      }
    }

    $scope.deleteBar = function(present) {
      var index = $scope.bass.presents.indexOf(present);
      $scope.bass.presents.splice(index, 1);
      deleteObsoletePresents();
      if ($scope.bass.presents) {
        $scope.loadBassPresent($scope.bass.presents[0]);
      } else {
        $scope.bass.present = {name: ''};
        $scope.bass.presents = [$scope.bass.present];
      }
    };

    $scope.saveBar = function() {
      deleteObsoletePresents();
      var storageKey = 'v5.bass.present.'+$scope.bass.present.name;
      $scope.bass.present.data = $scope.bassData;
      console.log($scope.bass.present);

      //var data = $scope.bass.presents.map(function(bar) {
      var bar = $scope.bass.present;
      var data = {
        name: bar.name,
        data: bar.data
      };
      console.log(data);
      localStorage.setItem(storageKey, JSON.stringify(data));
    };

    $scope.loadBassPresent = function(present) {
      if (present && present !== $scope.bass.present) {
        console.log('Load: '+present.name);
        $scope.bassData = present.data;
        $scope.bass.present = present;
      }
    };

    function loadSavedBars() {
      var storageKey = 'v5.bass.presents';
      var presents = [];
      var i;
      for (i=0; i<localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key.startsWith('v5.bass.present.')) {
          var present = JSON.parse(localStorage.getItem(key));
          presents.push(present);
        }
      }
      // console.log(presents);
      // presents = null;
      if (presents) {
        $scope.bass.presents = presents;
        $scope.loadBassPresent(presents[0]);
      } else {
        $scope.bass.present = {name: ''};
        $scope.bass.presents = [$scope.bass.present];
      }
    }

    loadSavedBars();
    */

    // $scope.swiper = {};

    $scope.onBarSwiper = function(swiper) {
      console.log('Bar');
      console.log(swiper);
      $scope.barSwiper = swiper;
    };
    $scope.onBassSwiper = function(swiper) {
      console.log('Bass');
      console.log(swiper);
      $scope.bassSwiper = swiper;
      $scope.barSwiper.params.control = [swiper];
    };
    $scope.onDrumsSwiper = function(swiper) {
      console.log('Drums');
      console.log(swiper);
      $scope.drumsSwiper = swiper;
      $scope.barSwiper.params.control.push(swiper);
      $scope.beatsPerSlideChenged();
    };
  }
})();
