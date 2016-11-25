(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('PlaylistEditor', PlaylistEditor);

  function PlaylistEditor($scope, $timeout, projectManager, workspace) {

    $scope.selected = {item: null};

    var projectSections = projectManager.project.sections.map(function(section) {
      return {
        section: section.id,
        repeats: 1
      };
    });

    $scope.availableSections = [];
    function updateAvailableSections() {
      $scope.availableSections = projectSections.filter(function(projectSection) {
        return !workspace.playlist.items.some(function(playlistItem) {
          return playlistItem.section === projectSection.section;
        });
      });
    }
    function updatePlaylist() {
      updateAvailableSections();
      $scope.updatePlaylist();
    }
    updateAvailableSections();


    $scope.dropPlaylistSection = function(evt, list, dragData, dropSectionIndex) {

      // move dragged section item into dropped position
      list.splice(dropSectionIndex, 0, dragData.data);
      if (dragData.index >= 0 && dropSectionIndex >= 0 && evt.dataTransfer.dropEffect === "move") {
        var removeIndex = dragData.index;
        if (dragData.index > dropSectionIndex) {
          removeIndex += 1;
        }
        list.splice(removeIndex, 1);
      }
      updatePlaylist();
    };

    $scope.playlistKeyPressed = function(evt) {
      switch (evt.keyCode) {
        case 46: // Del
          if ($scope.selected.item) {
            var index = workspace.playlist.items.indexOf($scope.selected.item);
            workspace.playlist.items.splice(index, 1);
            $scope.selected.section = workspace.playlist.items[index];
            var nextItemElem = evt.target.nextElementSibling;
            if (nextItemElem) {
              $timeout(function() {
                nextItemElem.focus();
              });
            }
            updatePlaylist();
          }
      }
    };

    $scope.clearPlaylist = function() {
      workspace.playlist.items.splice(0, workspace.playlist.items.length);
      updatePlaylist();
    };

    $scope.moveAllUnused = function() {
      $scope.availableSections.forEach(function(projectSection) {
        var item = angular.copy(projectSection);
        item.repeats = 1;
        workspace.playlist.items.push(item)
      });
      updatePlaylist();
    };

    function playlistLoaded() {
      updateAvailableSections();
    }
    projectManager.on('playlistLoaded', playlistLoaded);
    $scope.$on('$destroy', function() {
      projectManager.un('playlistLoaded', playlistLoaded);
    });
  }
})();
