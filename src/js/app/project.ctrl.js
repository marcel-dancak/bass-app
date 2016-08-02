(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('ProjectController', ProjectController)

  function ProjectController($scope, $timeout, $http, context, audioPlayer,
              audioVisualiser, Notes, Section, Timeline, HighlightTimeline) {

    function clearSection() {
      audioVisualiser.clear();
      $scope.section.forEachBeat(function(beat) {
        $scope.section.clearBassBeat(beat.bass);
        $scope.section.clearDrumsBeat(beat.drums);
      });
    };

    function newSection() {
      var newId = Math.max.apply(
        null,
        $scope.project.sections.map(function(section) {
          return section.id;
        })
      )+1;
      console.log($scope.project.sections.map(function(section) {
          return section.id;
        }));
      console.log('New id: '+newId)
      var sectionInfo = {
        id: newId,
        name: 'New'
      };
      $scope.project.sections.push(sectionInfo);
      $scope.project.selectedSectionIndex = $scope.project.sections.length-1;
      return sectionInfo;
    }

    function loadSectionData(sectionData) {
      if (sectionData.bpm) {
        $scope.player.bpm = sectionData.bpm;
      }
      if (sectionData.animationDuration) {
        $scope.section.animationDuration = sectionData.animationDuration;
      }
      var sectionConfigChanged = $scope.section.timeSignature.top !== sectionData.timeSignature.top;

      $scope.section.setLength(sectionData.length);

      $scope.section.timeSignature = sectionData.timeSignature;
      $scope.player.playbackRange.start = 1;
      $scope.player.playbackRange.end = sectionData.length + 1;
      $scope.updatePlaybackRange();

      $scope.slides.beatsPerView = sectionData.beatsPerView;
      $scope.slides.beatsPerSlide = sectionData.beatsPerSlide;
      $scope.updateSwipers();

      $timeout(function () {
        $scope.$root.$broadcast('rzSliderForceRender');
      });

      $timeout(function() {

        // override selected section data
        sectionData.beats.forEach(function(beat) {
          if (beat.bass) {
            var destBassBeat = section.bassBeat(beat.bar, beat.beat);
            if (beat.bass.subdivision !== destBassBeat.subdivision) {
              var flatIndex = (beat.bar-1)*section.timeSignature.top+beat.beat-1;
              var barBeat = $scope.slides.bars[flatIndex];
              $scope.setBeatSubdivision(barBeat, destBassBeat, beat.bass.subdivision);
            }
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
        // update references
        $scope.section.forEachBeat(function(beat) {
          $scope.section.updateBassReferences(beat.bass);
        });
      });
    }

    $scope.newEmptySection = function() {
      newSection();
      clearSection();
    };

    $scope.deleteSection = function(index) {
      console.log('delete '+index);
      if (index !== -1) {
        var storageKey = 'v9.section.'+$scope.project.sections[index].id;
        localStorage.removeItem(storageKey);
        $scope.project.sections.splice(index, 1);
      }
      $scope.project.selectedSectionIndex = -1;
      $scope.project.sectionName = '';
      clearSection();
      saveProjectInfo();
    };

    function serializeSection(section) {
      var sectionStorageBeats = [];
      section.forEachBeat(function(beat) {
        sectionStorageBeats.push({
          bar: beat.bar,
          beat: beat.index,
          bass: {
            subdivision: beat.bass.subdivision,
            sounds: section.getBassSounds(beat.bass)
          },
          drums: {
            subdivision: beat.drums.subdivision,
            sounds: section.getDrumsSounds(beat.drums)
          }
        });
      });

      var data = {
        timeSignature: section.timeSignature,
        length: section.length,
        beats: sectionStorageBeats,
        // other section configuration
        beatsPerView: $scope.slides.beatsPerView,
        beatsPerSlide: $scope.slides.beatsPerSlide,
        animationDuration: $scope.slides.animationDuration,
        bpm: $scope.player.bpm
      }
      return JSON.stringify(data);
    }

    $scope.saveSection = function(index) {
      var sectionInfo = $scope.project.sections[index];
      if (sectionInfo && !$scope.project.sectionName) {
        return;
      }

      var section = $scope.section;

      if (!sectionInfo) {
        // save as new
        console.log('save as new');
        sectionInfo = newSection();
        if (index === -1 && $scope.project.sectionName) {
          sectionInfo.name = $scope.project.sectionName;
        } else {
          $scope.project.sectionName = sectionInfo.name;
        }
      } else {
        sectionInfo.name = $scope.project.sectionName;
      }

      var storageKey = 'v9.section.'+sectionInfo.id;
      console.log(storageKey);
      var data = serializeSection($scope.section);
      localStorage.setItem(storageKey, data);
      saveProjectInfo();
    };

    $scope.loadSection = function(index) {
      console.log('loadSection');
      var sectionInfo = $scope.project.sections[index];
      if (!sectionInfo) {
        return;
      }
      clearSection();

      $scope.project.sectionName = sectionInfo.name;
      // var storageKey = 'v8.section.'+sectionInfo.name;
      var storageKey = 'v9.section.'+sectionInfo.id;

      var data = localStorage.getItem(storageKey);
      if (!data) {
        return;
      }
      var sectionData = JSON.parse(data);
      console.log(sectionData);
      loadSectionData(sectionData);
    };

    /*
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

    function loadSavedSections() {
      var names = loadSavedSectionsNames();
      var sections = names.map(function(name, index) {
        return {
          id: index,
          name: name
        }
      });
      console.log(sections);
      return sections;
    }*/

    function loadProjectInfo() {
      var storageKey = 'v9.project';
      var jsonData = localStorage.getItem(storageKey);
      if (jsonData) {
        return JSON.parse(jsonData);
      }
    }

    function saveProjectInfo() {
      var storageKey = 'v9.project';
      var jsonData = JSON.stringify($scope.project);
      localStorage.setItem(storageKey, jsonData);
    }

    $scope.project = loadProjectInfo() || {
      sections: []
      // sections: loadSavedSections()
    };
    $scope.project.selectedSectionIndex = -1;
    $scope.project.sectionName = '';



    $scope.dropSection = function(event, dragSectionIndex, dropSectionIndex, dropSection) {
      var dragSection = $scope.project.sections[dragSectionIndex];
      var selectedId = $scope.project.sections[$scope.project.selectedSectionIndex].id;

      // move dragged section item into dropped position
      $scope.project.sections.splice(dropSectionIndex, 0, dragSection);
      var removeIndex = dragSectionIndex;
      if (dragSectionIndex > dropSectionIndex) {
        removeIndex += 1;
      }
      $scope.project.sections.splice(removeIndex, 1);


      // update selected secton item
      if ($scope.project.selectedSectionIndex !== -1) {
        var newSelectedIndex = $scope.project.sections.findIndex(function(s) {
          return s.id === selectedId;
        });
        $scope.project.selectedSectionIndex = newSelectedIndex;
      }
      // save the actual list
      saveProjectInfo();
    }

    // swap items
    /*
    $scope.dropSection = function(event, dragSectionIndex, dropSectionIndex, dropSection) {
      var dragSection = $scope.project.sections[dragSectionIndex];
      // console.log(dragSection);
      // console.log(dropSection);
      var tmpId = dropSection.id;
      var tmpName = dropSection.name;
      dropSection.id = dragSection.id;
      dropSection.name = dragSection.name;
      dragSection.id = tmpId;
      dragSection.name = tmpName;

      if ($scope.project.selectedSectionIndex === dragSectionIndex) {
        $scope.project.selectedSectionIndex = dropSectionIndex;
      }
      if ($scope.project.selectedSectionIndex === dropSectionIndex) {
        $scope.project.selectedSectionIndex = dragSectionIndex;
      }
      saveProjectInfo();
    }
    */

    $scope.exportToFile = function() {
      if ($scope.project.sectionName) {
        console.log('exportToFile');
        var blob = new Blob(
          [serializeSection($scope.section)],
          {type: "application/json;charset=utf-8"}
        );
        saveAs(blob, $scope.project.sectionName+'.json');
      }
    }


    function handleFileSelect(evt) {
      evt.stopPropagation();
      evt.preventDefault();

      var files = evt.dataTransfer.files; // FileList object.

      console.log(files);
      var file = files[0];
      var reader = new FileReader();
      reader.onload = function(theFile) {
        var json = reader.result;
        loadSectionData(JSON.parse(json));
      };
      reader.readAsText(file)
    }

    function handleDragOver(evt) {
      evt.stopPropagation();
      evt.preventDefault();
      evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
    }
    var projectDropElem = document.querySelector('.project-toolbar');
    console.log(projectDropElem);
    projectDropElem.addEventListener('dragover', handleDragOver, false);
    projectDropElem.addEventListener('drop', handleFileSelect, false);
  }
})();