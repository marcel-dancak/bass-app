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
        sections: [],
        tracks: [],
        tracksMap: {},
        playlists: []
      };
      tracks.forEach(this.addTrack.bind(this));
      return this.project;
    };

    ProjectManager.prototype.loadProject = function(projectData) {
      this.project = {
        sections: projectData.index,
        tracks: [],
        tracksMap: {},
        playlists: []
      };
      this.projectData = projectData.sections;
      projectData.tracks.forEach(this.addTrack.bind(this));
      return this.project;
    };

    ProjectManager.prototype.createSection = function(section) {
      var newId = Math.max.apply(
        null,
        this.project.sections.map(function(section) {
          return section.id;
        })
      ) + 1;
      newId = Math.max(newId, 1);

      console.log('New id: '+newId);
      section.id = newId;
      section.tracks = {};
      this.project.sections.push(section);
      this.project.selectedSectionIndex = this.project.sections.length-1;
      this.section = section;
      return section;
    };

    ProjectManager.prototype.getSectionsList = function() {

      var storageKey = 'v9.project';
      var jsonData = localStorage.getItem(storageKey);
      if (jsonData) {
        console.log(jsonData);
        return JSON.parse(jsonData);
      }
      return [];
    }

    ProjectManager.prototype.saveProjectInfo = function() {
      var storageKey = 'v9.project';
      var sectionsIndex = this.project.sections.map(function(section) {
        return {
          id: section.id,
          name: section.name
        };
      });
      var trackExcludedProperties = ['id', 'instrument', 'audio'];
      var tracks = this.project.tracks.map(function(track) {
        return Object.keys(track).reduce(function(obj, property) {
          if (trackExcludedProperties.indexOf(property) === -1) {
            obj[property] = track[property];
          }
          return obj;
        }, {});
      });

      var data = {
        index: sectionsIndex,
        tracks: tracks
      }
      var jsonData = JSON.stringify(data);
      console.log(jsonData);
      // localStorage.setItem(storageKey, jsonData);
    }

    /*
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
    */

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


    ProjectManager.prototype.serializeSectionTrack = function(trackSection) {
      console.log(trackSection);
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

    ProjectManager.prototype.serializeSection = function(section) {

      var data = {
        name: section.name,
        timeSignature: section.timeSignature,
        length: section.length,
        // other section configuration
        beatsPerView: section.beatsPerView,
        beatsPerSlide: section.beatsPerSlide,
        animationDuration: section.animationDuration,
        bpm: section.bpm,

        tracks: {
          // 'bass_0': this.serializeSectionTrack(section.tracks['bass_0']),
          // 'drums_0': this.serializeSectionTrack(section.tracks['drums_0'])
        }
      }
      this.project.tracks.forEach(function(track) {
        var trackSection = section.tracks[track.id];
        if (trackSection) {
          data.tracks[track.id] = trackSection.rawData();//this.serializeSectionTrack(trackSection);
        }
      }, this);

      return JSON.stringify(data, null, 4);
    }

    ProjectManager.prototype.saveSection = function(index) {
      console.log('saveSection: '+index);
      var sectionInfo = this.project.sections[index];
      if (sectionInfo && !this.section.name) {
        return;
      }

      var storageKey = 'v9.section.'+sectionInfo.id;
      var data = this.serializeSection(this.section);
      console.log(data);
      localStorage.setItem(storageKey, data);
      this.saveProjectInfo();
    };


    ProjectManager.prototype.loadSectionData = function(section) {
      console.log('loadSectionData');
      console.log(section);

      for (var trackId in section.tracks) {
        var trackData = section.tracks[trackId];
        var track = trackId.startsWith('bass')? new BassTrackSection(trackData) : new DrumTrackSection(trackData);
        track.audio = this.project.tracksMap[trackId].audio;
        track.instrument = this.project.tracksMap[trackId].instrument;
        section.tracks[trackId] = track;
      }
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
        if (angular.isFunction(sectionData.tracks[this.project.tracks[0].id].beat)) {
          console.log('Already converted section');
          // already converted to Track
          return sectionData;
        }
        // TODO: remove, leaved temporary for backward compatibility
        sectionData.name = this.project.sections[index].name;

        return this.loadSectionData(sectionData);
      }
    }

    ProjectManager.prototype.loadSection = function(index) {
      console.log('loadSection');
      this.section = this.getSection(index);
      this.dispatchEvent('sectionLoaded', this.section);
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
        var section = projectManager.loadSectionData(JSON.parse(json));
        angular.extend(projectManager.section, section);
        $timeout(function() {
          projectManager.dispatchEvent('sectionLoaded', projectManager.section);
        });
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