(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('NoteController', NoteController);

  function NoteController($scope, $timeout) {
    var notesLabels = [];
    $scope.bass.notes.scaleNotes.forEach(function(note) {
      notesLabels.push.apply(notesLabels, note.label);
    });
    $scope.notesLabels = notesLabels;

    $scope.playingStyles = ['finger', 'slap', 'pop', 'tap', 'hammer', 'pull'];

    $scope.clearNote = function(subbeat) {
      console.log('clearNote');
      console.log(subbeat);
      subbeat.note = {};
      // subbeat.length = 0;
      if (subbeat.width > 1) {
        var count = subbeat.width-1;
        var subbeat = subbeat;
        while(count--) {
          subbeat = subbeat.bar.nextSubbeat(subbeat);
          subbeat.width = 1;
        }
      }
      subbeat.width = 1;
      $scope.updateNote(subbeat);
    };

    $scope.updateNote = function(subbeat) {
      $scope.$root.$broadcast('subbeatChanged', subbeat);
    };

    $scope.checkMeasure = function(subbeat) {
      if (subbeat.width > 1) {
        var count = subbeat.width-1;
        var nextSubbeat = subbeat;
        while(count--) {
          nextSubbeat = subbeat.bar.nextSubbeat(nextSubbeat);
          nextSubbeat.width = 1;
        }
      }
      if (subbeat.note.length) {
        subbeat.width = (subbeat.note.length / 0.25) * 4;
      }
      if (subbeat.width > 1) {
        var count = subbeat.width - 1;
        var nextSubbeat = subbeat;
        while (count--) {
          nextSubbeat = subbeat.bar.nextSubbeat(nextSubbeat);
          nextSubbeat.width = 0;
        }
      }
    };
    $scope.bar.subbeats.forEach($scope.checkMeasure);
  }

})();
