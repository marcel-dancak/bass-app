(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('TabsController', TabsController);

  function TabsController($scope) {

    function noteStringIndex(note) {
      var noteName = note.name + note.octave;
      return $scope.bass.notes.list.indexOf($scope.bass.notes.map[noteName]);
    }

    function previousNoteSubbeat(subbeat) {
      var prevSubbeat = subbeat;
      while (prevSubbeat) {
        prevSubbeat = subbeat.bar.prevSubbeat(prevSubbeat);
        if (prevSubbeat.note && prevSubbeat.note.name && prevSubbeat.note.octave) {
          return prevSubbeat;
        }
      }
    }
    $scope.previousNoteSubbeat = previousNoteSubbeat;

    function updateSubbeatTabs(subbeat) {
      var tabs = {};
      if (subbeat.note) {
        if (subbeat.note.name === 'x') {
          $scope.bass.strings.forEach(function(string) {
            tabs[string.index] = 'x';
          });
        } else {
          var noteIndex = noteStringIndex(subbeat.note);
          $scope.bass.strings.forEach(function(string) {
            var fret = noteIndex - string.noteIndex;
            tabs[string.index] = (fret >= 0 && fret <= 24)? fret.toString() : '';
          });
        }
        if (subbeat.note.style === 'hammer' || subbeat.note.style === 'pull') {
          var prev = previousNoteSubbeat(subbeat);
          $scope.bass.strings.forEach(function(string) {
            if (!tabs[string.index]) {
              prev.tabs[string.index] = '';
            }
            if (!prev.tabs[string.index]) {
              tabs[string.index] = '';
            }
          });
        }
      }
      subbeat.tabs = tabs;
    }

    $scope.bar.subbeats.forEach(updateSubbeatTabs);

    $scope.$on('subbeatChanged', function(evt, subbeat) {
      updateSubbeatTabs(subbeat);
    });
  }
})();
