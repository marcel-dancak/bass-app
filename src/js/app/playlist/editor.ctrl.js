(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('PlaylistEditor', PlaylistEditor);

  function PlaylistEditor($scope, $timeout, projectManager, workspace) {

    $scope.selected = {section: null};

    workspace.track = projectManager.project.tracksMap['bass_0'];

    var availableSections = angular.copy(projectManager.project.sections);
    availableSections.forEach(function(section) {
      section.repeats = 1;
    });
    $scope.availableSections = availableSections;
    $scope.playlist = [];

    $scope.dropPlaylistSection = function(evt, list, dragData, dropSectionIndex) {
      console.log(list);
      console.log(dragData);

      // move dragged section item into dropped position
      list.splice(dropSectionIndex, 0, dragData.data);
      if (dragData.index >= 0 && dropSectionIndex >= 0 && evt.dataTransfer.dropEffect === "move") {
        var removeIndex = dragData.index;
        if (dragData.index > dropSectionIndex) {
          removeIndex += 1;
        }
        list.splice(removeIndex, 1);
      }
    };

    $scope.playlistKeyPressed = function(evt) {
      console.log(evt);
      switch (evt.keyCode) {
        case 46: // Del
          if ($scope.selected.section) {
            var index = $scope.playlist.indexOf($scope.selected.section);
            console.log(index);
            $scope.playlist.splice(index, 1);
            $scope.selected.section = $scope.playlist[index];
            var nextItemElem = evt.target.nextElementSibling;
            if (nextItemElem) {
              $timeout(function() {
                nextItemElem.focus();
              });
            }
          }
      }
    };

    $scope.ui.showPlaylist = function() {
      var playlist = $scope.playlist;
      projectManager.project.playlists = [playlist];
      $scope.ui.playlist.mode = 'view';
    };
  }
})();
