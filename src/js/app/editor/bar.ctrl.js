(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('BarController', BarController);

  function BarController($scope, $timeout, $mdDialog, workspace) {

    $scope.contextMenu = {
      show: angular.noop,
      element: null,
      beat: null
    };


    $scope.contextMenu.open = function(evt, index) {
      console.log('openBeatMenu');
      if (!$scope.contextMenu.element) {
        $scope.contextMenu.element = document.querySelector('.beat-menu');
      }
      $scope.contextMenu.beat = $scope.slides[index].beat;

      var parentBox = evt.target.getBoundingClientRect();

      $scope.contextMenu.element.style.position = 'fixed';
      $scope.contextMenu.element.style.left = parentBox.left+'px';
      $scope.contextMenu.element.style.top = parentBox.top+'px';
      $scope.contextMenu.element.style.width = parentBox.width+'px';
      $scope.contextMenu.element.style.height = parentBox.height+'px';

      var offsetElem = $scope.contextMenu.element.getElementsByTagName("offset")[0];
      offsetElem.style.left = (evt.clientX-parentBox.left)+'px';
      offsetElem.style.top = (evt.clientY-parentBox.top)+'px';

      $timeout(function() {
        $scope.contextMenu.element.children[0].click();
      });
    };


    workspace.clipboard = [];
    $scope.copyBar = function() {
      var barIndex = $scope.contextMenu.beat.bar;
      console.log('Copy bar: '+barIndex);

      workspace.clipboard.splice(0, workspace.clipboard.length);
      for (var beatIndex = 1; beatIndex <= workspace.section.timeSignature.top; beatIndex++) {
        var beat = workspace.trackSection.beat(barIndex, beatIndex);
        workspace.clipboard.push(workspace.trackSection.rawBeatData(beat));
      }
      workspace.clipboard = angular.copy(workspace.clipboard);
      workspace.clipboard.type = workspace.trackSection.type;
    };

    $scope.pasteBar = function() {
      if (workspace.clipboard.type !== workspace.trackSection.type) {
        return;
      }

      var barIndex = $scope.contextMenu.beat.bar;
      workspace.clipboard.forEach(function(beat) {
        beat.bar = barIndex;
        var destBeat = workspace.trackSection.beat(barIndex, beat.beat);
        workspace.trackSection.clearBeat(destBeat);
      });

      workspace.trackSection.loadBeats(workspace.clipboard);
      // make a new copy for next use (to avoid linked sounds)
      workspace.clipboard = angular.copy(workspace.clipboard);
      workspace.clipboard.type = workspace.trackSection.type;
    };

    $scope.clearBar = function() {
      var barIndex = $scope.contextMenu.beat.bar;
      for (var beatIndex = 1; beatIndex <= workspace.section.timeSignature.top; beatIndex++) {
        var beat = workspace.trackSection.beat(barIndex, beatIndex);
        workspace.trackSection.clearBeat(beat);
      }
    };

    $scope.labelEditor = function(ev) {
      // Appending dialog to document.body to cover sidenav in docs app
      var confirm = $mdDialog.prompt()
        .title('Text Comment')
        .textContent('Text comment displayed at the bottom')
        .placeholder('Text')
        .ariaLabel('Text')
        .targetEvent(ev)
        .ok('OK')
        .cancel('Cancel');
      if ($scope.contextMenu.beat.meta) {
        confirm = confirm.initialValue($scope.contextMenu.beat.meta.note || '');
      }

      $mdDialog.show(confirm).then(function(result) {
        $scope.contextMenu.beat.meta.note = result;
      }, angular.noop);
    }
  }
})();