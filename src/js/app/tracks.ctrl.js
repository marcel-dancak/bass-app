(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('TracksController', TracksController);


  function TracksController($scope, $mdUtil, $mdDialog, context, workspace, audioPlayer, audioVisualiser, projectManager, player) {
    $scope.runtime = window.runtime;
    $scope.player = player;
    $scope.project = projectManager.project;
    $scope.workspace = workspace;
    $scope.input = audioPlayer.input;

    $scope.toggleVolumeMute = function(instrument) {
      if (!instrument.muted) {
        instrument._volume = instrument.audio.gain.value;
        // zero gain value would cause invalid drawing of audio signal
        instrument.audio.gain.value = 0.0001;
      } else {
        instrument.audio.gain.value = instrument._volume || instrument.audio.gain.value;
      }
      instrument.muted = !instrument.muted;
    };

    $scope.toggleInputMute = function(input) {
      $scope.toggleVolumeMute(input);
      if (input.muted) {
        console.log('mute microphone');
        // input.stream.removeTrack(input.stream.getAudioTracks()[0]);
        // input.source.disconnect();
        // audioVisualiser.deactivate();
        // audioVisualiser.activate(workspace.track.audio);
      } else {
        if (!input.source) {
          var gotStream = function(stream) {
            input.stream = stream;
            // Create an AudioNode from the stream.
            input.source = context.createMediaStreamSource(stream);
            input.source.connect(input.audio);
            audioVisualiser.activate(input.audio);
            input.audio.connect(context.destination);
          }

          var error = function(err) {
            alert('Failed to use microphone.');
          }

          navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;
          navigator.getUserMedia({ audio: true }, gotStream, error);
        } else {
          // input.source.connect(input.audio);
          // audioVisualiser.setInputSource(context, input.audio);
        }
      }
    };

    $scope.addFileAudioTrack = function(file) {
      if (!workspace.section.audioTrackStart) {
        workspace.section.audioTrackStart = [0, 0, 0];
      }
      $mdUtil.nextTick(function() {
        $scope.$broadcast('rzSliderForceRender');
      });
      projectManager.addUrlStreamTrack(file.content);
    };

    $scope.addYoutubeTrack = function(file) {
      var prompt = $mdDialog.prompt()
        .title('Online Stream')
        .textContent('Enter Youtube video or other supported online stream resource')
        .placeholder('Youtube video, SoundCloud track, ...')
        .ok('OK')
        .cancel('Cancel');

      $mdDialog.show(prompt)
        .then(function(resource) {
          if (resource.startsWith('https://www.youtube.com')) {
            resource = new URL(resource).searchParams.get('v');
          }
          if (!resource.startsWith('http')) {
            resource = 'https://www.youtube.com/watch?v='+resource;
          }
          projectManager.addOnlineStreamTrack(resource);
          if (!workspace.section.audioTrackStart) {
            workspace.section.audioTrackStart = [0, 0, 0];
          }
        })
        .catch(angular.noop);
    };

    $scope.removeAudioTrack = projectManager.removeAudioTrack.bind(projectManager);

    // initialize audioTrackStart model
    if (workspace.section && !workspace.section.audioTrackStart) {
      workspace.section.audioTrackStart = [0, 0, 0];
    }
  }
})();
