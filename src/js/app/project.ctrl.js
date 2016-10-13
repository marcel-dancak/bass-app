(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('ProjectController', ProjectController);


  function ProjectController($scope, $timeout, audioVisualiser, projectManager) {

    $scope.newSection = function() {
      var config = {};
      if (projectManager.section) {
        ['timeSignature', 'beatsPerSlide', 'beatsPerView', 'animationDuration'].forEach(function(property) {
          config[property] = projectManager.section[property];
        });
      }
      var section = projectManager.createSection(config);
      workspace.selectedSectionId = section.id;
      projectManager.loadSection(workspace.selectedSectionId);
    };

    $scope.newPlaylist = function() {
      workspace.playlist = projectManager.createPlaylist();
      workspace.selectedPlaylistId = workspace.playlist.id;
    };

    $scope.itemReorderHandler = function(event, dragItemId, dropItemId, list) {
      var dragItemIndex = list.findIndex(function(item) {
        return item.id === dragItemId;
      });
      var dragItem = list.splice(dragItemIndex, 1)[0];
      var dropItemIndex = list.findIndex(function(item) {
        return item.id === dropItemId;
      });
      list.splice(dropItemIndex, 0, dragItem);
    }

    $scope.exportToFile = function() {
      if (workspace.section.name) {
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
        $timeout(function() {
          projectManager.importSection(section);
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