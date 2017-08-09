(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('TracksController', TracksController);


  function TracksController($scope, $mdUtil, context, workspace, audioPlayer, audioVisualiser, projectManager) {
    $scope.runtime = window.runtime;
    $scope.project = projectManager.project;
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

    $scope.addAudioTrack = function(file) {
      var gain = context.createGain();
      gain.connect(context.destination);
      $mdUtil.nextTick(function() {
        $scope.$broadcast('rzSliderForceRender');
      });
      // use saved 'start' value if exists
      var savedStart;
      if (workspace.section.audioTrackStart) {
        savedStart = workspace.section.audioTrackStart.split(":").map(Number);
      }
      projectManager.project.audioTrack = {
        data: null,
        audio: gain,
        start: savedStart || [0,0,0]
      };
      context.decodeAudioData(file.content, function(buffer) {
        projectManager.project.audioTrack.data = buffer
      });
    };
  }
})();
