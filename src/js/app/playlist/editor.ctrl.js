(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('PlaylistEditor', PlaylistEditor);

  function PlaylistEditor($scope, $timeout, projectManager, workspace) {

    $scope.selected = {section: null};
    $scope.playlist = projectManager.project.playlists[0];

    var projectSections = projectManager.project.sections.map(function(section) {
      return {
        id: section.id,
        repeats: 1
      };
    });

    $scope.availableSections = [];
    function updateAvailableSection() {
      $scope.availableSections = projectSections.filter(function(projectSection) {
        return !$scope.playlist.some(function(playlistSection) {
          return playlistSection.id === projectSection.id;
        });
      });
      $scope.updatePlaylist();
    }
    updateAvailableSection();

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
      updateAvailableSection();
    };

    $scope.playlistKeyPressed = function(evt) {
      switch (evt.keyCode) {
        case 46: // Del
          if ($scope.selected.section) {
            var index = $scope.playlist.indexOf($scope.selected.section);
            $scope.playlist.splice(index, 1);
            $scope.selected.section = $scope.playlist[index];
            var nextItemElem = evt.target.nextElementSibling;
            if (nextItemElem) {
              $timeout(function() {
                nextItemElem.focus();
              });
            }
            updateAvailableSection();
          }
      }
    };

    $scope.clearPlaylist = function() {
      $scope.playlist.splice(0, $scope.playlist.length);
      updateAvailableSection();
    };

    $scope.moveAllUnused = function() {
      $scope.availableSections.forEach(function(projectSection) {
        var item = angular.copy(projectSection);
        item.repeats = 1;
        $scope.playlist.push(item)
      });
      $scope.availableSections = [];
    };

  }
})();
