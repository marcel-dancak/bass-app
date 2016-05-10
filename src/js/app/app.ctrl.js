(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('AppController', AppController)
    .value('context', new AudioContext());

  function AppController($scope, $timeout, $mdDialog, context, audioPlayer, audioVisualiser, NotesModel, Section) {
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
      stringFret: function(stringIndex, note) {
        var noteName = note.name + note.octave;
        var index = bassNotes.list.indexOf(bassNotes.map[noteName]);
        var fret = index - $scope.bass.strings[stringIndex].noteIndex;
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

    $scope.section = new Section($scope.bass, $scope.drums, {
      timeSignature: {
        top: 4,
        bottom: 4
      },
      length: 2
    });

    $scope.slides = {
      bars: [],
      bass: [],
      drums: [],
      beatsPerSlide: 2,
      beatsPerView: 5,
      visibleSubbeats: [1, 2, 3, 4]
    };

    function updateSlides() {
      var timeSignature = $scope.section.timeSignature;
      $scope.slides.bars = [];
      $scope.slides.bass = [];
      $scope.slides.drums = [];

      $scope.section.forEachBeat(function(beat) {
        var beatId = beat.bar+'_'+beat.index;
        beat.bass.id = beatId;
        beat.drums.id = beatId;
        $scope.slides.bass.push(beat.bass);
        $scope.slides.drums.push(beat.drums);
        $scope.slides.bars.push({
          id: beatId,
          bar: beat.bar,
          subbeats: [beat.index, 'i', 'and', 'a']
        });
      });
    }

    $scope.renderingBar = function(index) {
      console.log('Rendering Bar: '+index);
    };

    $scope.sectionConfigChanged = function() {
      console.log($scope.section.length);
      $scope.section.setLength($scope.section.length);
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

    $scope.beatsPerSlideChanged = function() {
      $scope.barSwiper.params.slidesPerGroup = $scope.slides.beatsPerSlide;
      $scope.bassSwiper.params.slidesPerGroup = $scope.slides.beatsPerSlide;
      $scope.drumsSwiper.params.slidesPerGroup = $scope.slides.beatsPerSlide;
      $scope.barSwiper.updateSlidesSize();
      $scope.bassSwiper.updateSlidesSize();
      $scope.drumsSwiper.updateSlidesSize();
    };

    $scope.beatsPerViewChanged = function() {
      var beatsPerView = $scope.slides.beatsPerView;
      // restrict beats per view to meaningful values
      beatsPerView = Math.max(beatsPerView, 1);
      beatsPerView = Math.min(beatsPerView, 16);
      beatsPerView = Math.min(beatsPerView, $scope.section.timeSignature.top*$scope.section.length);
      if (beatsPerView !== $scope.slides.beatsPerView) {
        $scope.slides.beatsPerView = beatsPerView;
      }

      $scope.barSwiper.params.slidesPerView = beatsPerView;
      $scope.bassSwiper.params.slidesPerView = beatsPerView;
      $scope.drumsSwiper.params.slidesPerView = beatsPerView;

      $scope.barSwiper.updateSlidesSize();
      $scope.bassSwiper.updateSlidesSize();
      $scope.drumsSwiper.updateSlidesSize();
      var slideWidth = $scope.barSwiper.size / beatsPerView;
      // console.log(slideWidth);
      var visibleSubbeats;
      if (slideWidth > 240) {
        visibleSubbeats = [1, 2, 3, 4];
      } else if (slideWidth > 120) {
        visibleSubbeats = [1, 3];
      } else {
        visibleSubbeats = [1];
      }
      $scope.slides.visibleSubbeats = visibleSubbeats;
    };

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
      $scope.beatsPerSlideChanged();
    };

    updateSlides();


    $scope.$watch('player.bpm', function(value) {
      if (audioPlayer.playing) {
        audioPlayer.stop();
        audioPlayer.setBpm($scope.player.bpm);
        audioPlayer.play(
          $scope.section,
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
      $scope.barSwiper.slideTo(slide, 100, false);
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
        $scope.section,
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


    $scope.clearSection = function() {
      $scope.section.forEachBeat(function(beat) {
        beat.bass.subbeats.forEach(function(subbeat) {
          var string, bassSound;
          for (string in subbeat) {
            if (!string.startsWith('$')) {
              bassSound = subbeat[string].sound;
              delete bassSound.style;
              delete bassSound.note;
              delete bassSound.noteLength;
            }
          }
        });
        beat.drums.subbeats.forEach(function(subbeat) {
          var drumName, drumSound;
          for (drumName in subbeat) {
            if (!drumName.startsWith('$$')) {
              drumSound = subbeat[drumName]
              drumSound.volume = 0;
            }
          }
        });
      });
    };

    $scope.deleteSection = function(index) {
      if (index !== -1) {
        var storageKey = 'v8.section.'+$scope.project.sections[index];
        localStorage.removeItem(storageKey);
        $scope.project.sections.splice(index, 1);
      }
      $scope.project.selectedSectionIndex = -1;
      $scope.project.sectionName = '';
      $scope.clearSection();
    };

    $scope.saveSection = function(index, name) {
      if (!name) {
        return;
      }
      var section = $scope.section;
      console.log('saving: '+name);
      if ($scope.project.sections[index]) {
        // If section was renamed, delete old record
        if ($scope.project.sections[index] !== name) {
          var oldKey = 'v8.section.'+$scope.project.sections[index];
          // console.log('Old key: '+oldKey);
          localStorage.removeItem(oldKey);
          $scope.project.sections[index] = name;
        }
      } else {
        // save as new record
        $scope.project.sections.push(name);
        $scope.project.selectedSectionIndex = $scope.project.sections.length-1;
      }

      var storageKey = 'v8.section.'+name;
      console.log(storageKey);
      var sectionStorageBeats = [];

      section.forEachBeat(function(beat) {
        var bassBeatSounds = [];
        var dumsBeatSounds = [];
        beat.bass.subbeats.forEach(function(subbeat, subbeatIndex) {
          var string, bassSound;
          for (string in subbeat) {
            if (string.startsWith('$')) {
              continue;
            }
            bassSound = subbeat[string].sound;
            if (bassSound.note) {
              bassBeatSounds.push({
                subbeat: subbeatIndex+1,
                sound: bassSound
              });
            }
          }
        });
        beat.drums.subbeats.forEach(function(subbeat, subbeatIndex) {
          var drumName, drumSound;
          for (drumName in subbeat) {
            drumSound = subbeat[drumName];
            if (drumSound.volume > 0) {
              // console.log('bar {0} beat {1} subbeat {2}'.format(beat.bar, beat.index, subbeatIndex+1));
              dumsBeatSounds.push({
                subbeat: subbeatIndex+1,
                volume: drumSound.volume,
                drum: drumName
              });
            }
          }
        });
        sectionStorageBeats.push({
          bar: beat.bar,
          beat: beat.index,
          bass: {
            subdivision: beat.bass.subdivision,
            sounds: bassBeatSounds
          },
          drums: {
            subdivision: beat.drums.subdivision,
            sounds: dumsBeatSounds
          }
        });
      });
      var data = {
        timeSignature: section.timeSignature,
        length: section.length,
        beats: sectionStorageBeats
      }
      console.log(JSON.stringify(data));
      localStorage.setItem(storageKey, JSON.stringify(data));
    };

    $scope.loadSection = function(index) {
      var sectionName = $scope.project.sections[index];
      if (!sectionName) {
        return;
      }
      $scope.project.sectionName = sectionName;
      var storageKey = 'v8.section.'+sectionName;
      console.log(storageKey);
      var sectionData = JSON.parse(localStorage.getItem(storageKey));
      console.log(sectionData);
      var sectionConfigChanged = $scope.section.timeSignature.top !== sectionData.timeSignature.top;

      $scope.section.setLength(sectionData.length);
      $scope.section.timeSignature = sectionData.timeSignature;
      if (sectionConfigChanged) {
        $scope.sectionConfigChanged();
      }
      $scope.clearSection();

      // override selected section data
      sectionData.beats.forEach(function(beat) {
        if (beat.bass) {
          beat.bass.sounds.forEach(function(bassSound) {
            var subbeat = $scope.section.bassSubbeat(beat.bar, beat.beat, bassSound.subbeat);
            angular.extend(subbeat[bassSound.sound.string].sound, bassSound.sound);
          });
        }
        beat.drums.sounds.forEach(function(drumSound) {
          var subbeat = $scope.section.drumsSubbeat(beat.bar, beat.beat, drumSound.subbeat);
          subbeat[drumSound.drum].volume = drumSound.volume;
        });
      });
    }

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
      selectedSectionIndex: null
    };
  }
})();
