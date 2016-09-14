(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('ProjectController', ProjectController)
    .factory('projectManager', projectManager);

  function projectManager($http, $timeout, $q, Observable, context,
      BassSection, DrumSection, Bass, Drums, BassTrackSection, DrumTrackSection) {

    function ProjectManager() {
      Observable.call(this, ["sectionLoaded", "sectionDeleted", "sectionCreated"]);
    }
    ProjectManager.prototype = Object.create(Observable.prototype);

    function queryStringParam(item) {
      var svalue = location.search.match(new RegExp("[\?\&]" + item + "=([^\&]*)(\&?)","i"));
      if (svalue !== null) {
        return decodeURIComponent(svalue ? svalue[1] : svalue);
      }
    }

    var idCouter = {};
    ProjectManager.prototype.addTrack = function(track) {
      if (angular.isUndefined(idCouter[track.type])) {
        idCouter[track.type] = 0;
      }
      track.id = track.type+'_'+idCouter[track.type];
      track.instrument = (track.type === 'bass')? new Bass(track) : Drums[track.kit];

      track.audio = context.createGain();
      track.audio.connect(context.destination);
      this.project.tracks.push(track);
      this.project.tracksMap[track.id] = track;
      idCouter[track.type] += 1;
      // TODO: add track for every existing section, or do it lazy
    };

    ProjectManager.prototype.createProject = function(tracks) {
      this.project = {
        sections: this.getSectionsList(),
        tracks: [],
        tracksMap: {}
      };
      tracks.forEach(this.addTrack.bind(this));
      return this.project;
    };

    ProjectManager.prototype.createSection = function(section) {
      section.tracks
      this.section = section;
      return section;
    };

    ProjectManager.prototype.getSectionsList = function() {

      var startupProject = queryStringParam("PROJECT");
      if (startupProject) {
        var task = $q.defer();
        var sectionsIndex = [];
        $http.get(startupProject+'.json').then(function(response) {
          console.log(response);
          this.projectData = response.data.sections;
          Array.prototype.push.apply(sectionsIndex, response.data.index);
          // task.resolve(response.data.index);
        }.bind(this));
        return sectionsIndex;
        // return task.promise;
      }
      /*
      var storageKeyPrefix = 'v9.section.';
      var sectionsNames = [];
      var i;
      for (i=0; i<localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key.startsWith(storageKeyPrefix)) {
          sectionsNames.push({
            id: key.substring(storageKeyPrefix.length),
            name: key.substring(storageKeyPrefix.length)
          });
        }
      }
      console.log(sectionsNames);
      return sectionsNames;
      */

      var storageKey = 'v9.project';
      var jsonData = localStorage.getItem(storageKey);
      if (jsonData) {
        console.log(jsonData);
        return JSON.parse(jsonData).sections;
      }
      return [];
    }

    ProjectManager.prototype.saveProjectInfo = function() {
      var storageKey = 'v9.project';
      var jsonData = JSON.stringify(this.project);
      localStorage.setItem(storageKey, jsonData);
    }

    ProjectManager.prototype.serializeSectionTrack = function(trackSection) {
      var sectionStorageBeats = [];
      trackSection.forEachBeat(function(beat) {
        sectionStorageBeats.push({
          bar: beat.bar,
          beat: beat.index,
          subdivision: beat.beat.subdivision,
          data: trackSection.beatSounds(beat.beat)
        });
      });
      return sectionStorageBeats;
    };


    ProjectManager.prototype.newSection = function() {
      var newId = Math.max.apply(
        null,
        this.project.sections.map(function(section) {
          return section.id;
        })
      ) + 1;
      newId = Math.max(newId, 1);

      console.log('New id: '+newId)
      var sectionInfo = {
        id: newId,
        name: 'New'
      };
      this.project.sections.push(sectionInfo);
      this.project.selectedSectionIndex = this.project.sections.length-1;
      this.dispatchEvent('sectionCreated');
      return sectionInfo;
    }


    ProjectManager.prototype.deleteSection = function(index) {
      console.log('delete '+index);
      if (index !== -1) {
        var storageKey = 'v9.section.'+this.project.sections[index].id;
        localStorage.removeItem(storageKey);
        this.project.sections.splice(index, 1);
      }
      this.project.selectedSectionIndex = -1;
      this.section.name = '';
      this.saveProjectInfo();
      this.dispatchEvent('sectionDeleted');
    };


    ProjectManager.prototype.serializeSection = function(section) {

      var data = {
        timeSignature: section.timeSignature,
        length: section.length,
        // other section configuration
        beatsPerView: section.beatsPerView,
        beatsPerSlide: section.beatsPerSlide,
        animationDuration: section.animationDuration,
        bpm: section.bpm,

        tracks: {
          'bass_0': this.serializeSectionTrack(section.tracks['bass_0']),
          'drums_0': this.serializeSectionTrack(section.tracks['drums_0'])
        }
      }

      return JSON.stringify(data, null, 4);
    }

    ProjectManager.prototype.saveSection = function(index) {
      var sectionInfo = this.project.sections[index];
      if (sectionInfo && !this.section.name) {
        return;
      }

      var section = $scope.section;

      if (!sectionInfo) {
        // save as new
        console.log('save as new');
        sectionInfo = this.newSection();
        console.log(sectionInfo);
        if (index === -1 && projectManager.section.name) {
          sectionInfo.name = projectManager.section.name;
        } else {
          this.section.name = sectionInfo.name;
        }
      } else {
        sectionInfo.name = this.section.name;
      }

      var storageKey = 'v9.section.'+sectionInfo.id;
      var data = serializeSection($scope.section);
      console.log(data);
      localStorage.setItem(storageKey, data);
      this.saveProjectInfo();
    };


    ProjectManager.prototype.loadSectionData = function(section) {
      console.log('loadSectionData');
      section.tracks = {
        bass_0: new BassTrackSection(section.tracks['bass_0'], this.project.tracksMap['bass_0'].instrument),
        drums_0: new DrumTrackSection(section.tracks['drums_0'], this.project.tracksMap['drums_0'].instrument)
      };
      return section;
    }

    ProjectManager.prototype.getSection = function(index) {
      var sectionInfo = this.project.sections[index];
      if (!sectionInfo) {
        return;
      }

      var sectionData;
      if (this.projectData) {
        sectionData = this.projectData[index];
      }
      if (!sectionData) {
        var storageKey = 'v9.section.'+sectionInfo.id;
        var data = localStorage.getItem(storageKey);
        if (data) {
          sectionData = JSON.parse(data);
        }
      }

      if (sectionData) {
        return this.loadSectionData(sectionData);
      }
    }

    ProjectManager.prototype.loadSection = function(index) {
      console.log('loadSection');
      var section = this.getSection(index);
      angular.extend(this.section, section);
      this.dispatchEvent('sectionLoaded', this.section);

      // TODO: remove, leaved temporary for backward compatibility
      this.section.name = this.project.sections[index].name;
    };

    return new ProjectManager();
  }


  function ProjectController($scope, $timeout, audioVisualiser, projectManager) {

    $scope.newSection = function() {
      projectManager.newSection();
    };

    $scope.loadSection = function(index) {
      projectManager.loadSection(index);
    };

    $scope.dropSection = function(event, dragSectionIndex, dropSectionIndex, dropSection) {
      var dragSection = projectManager.project.sections[dragSectionIndex];
      var selectedId = projectManager.project.sections[projectManager.project.selectedSectionIndex].id;

      // move dragged section item into dropped position
      projectManager.project.sections.splice(dropSectionIndex, 0, dragSection);
      var removeIndex = dragSectionIndex;
      if (dragSectionIndex > dropSectionIndex) {
        removeIndex += 1;
      }
      projectManager.project.sections.splice(removeIndex, 1);


      // update selected secton item
      if (projectManager.project.selectedSectionIndex !== -1) {
        var newSelectedIndex = projectManager.project.sections.findIndex(function(s) {
          return s.id === selectedId;
        });
        projectManager.project.selectedSectionIndex = newSelectedIndex;
      }
      // save the actual list
      projectManager.saveProjectInfo();
    }

    $scope.exportToFile = function() {
      if (projectManager.section.name) {
        console.log('exportToFile');
        var blob = new Blob(
          [projectManager.serializeSection(projectManager.section)],
          {type: "application/json;charset=utf-8"}
        );
        saveAs(blob, projectManager.section.name+'.json');
      }
    }

    function handleFileDrop(evt) {
      evt.stopPropagation();
      evt.preventDefault();

      var files = evt.dataTransfer.files; // FileList object.
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
    projectDropElem.addEventListener('dragover', handleDragOver, false);
    projectDropElem.addEventListener('drop', handleFileDrop, false);
  }
})();