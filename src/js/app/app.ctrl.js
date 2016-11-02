(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('AppController', AppController)
    .value('context', new AudioContext())
    .value('workspace', {})
    .directive('ngRightClick', function($parse) {
      return function(scope, element, attrs) {
        var fn = $parse(attrs.ngRightClick);
        element.bind('contextmenu', function(event) {
          scope.$apply(function() {
            event.preventDefault();
            fn(scope, {$event:event});
          });
        });
      };
    });

  function AppController($scope, $timeout, $mdDialog, context, workspace,
      audioPlayer, audioVisualiser, projectManager, Drums, dataUrl) {

    $scope.ui = {
      selectTrack: angular.noop,
      playlist: {},
    };
    $scope.player = {
      playing: false,
      play: angular.noop,
      input: audioPlayer.input,
      countdown: false,
      loop: true,
      speed: 100,
      playbackRange: {
        start: 1,
        end: 1,
        max: 1
      },
      playbackRangeChanged: angular.noop,
      graphEnabled: false,
      visibleBeatsOnly: false,
      playlist: []
    };
    $scope.playlistLabel = function(value) {
      var label = $scope.player.playlist[value-1];
      return label;
      // return '({0}) {1}'.format(value, label);
    };

    // initial volume for input after un-mute
    audioPlayer.input._volume = 0.75;

    $scope.bass = {
      playingStyles: [
        {
          name: 'finger',
          label: 'Finger'
        }, {
          name: 'slap',
          label: 'Slap'
        }, {
          name: 'pop',
          label: 'Pop'
        }, {
          name: 'pick',
          label: 'Pick'
        }, {
          name: 'tap',
          label: 'Tap'
        }, {
          name: 'hammer',
          label: 'Hammer-On'
        }, {
          name: 'pull',
          label: 'Pull-Off'
        }, {
          name: 'ring',
          label: 'Let ring'
        }
      ],
      settings: {
        label: 'name-and-fret',
        colors: true
      }
    };

    $scope.projectManager = projectManager;
    $scope.workspace = workspace;

    $scope.barLabels = {
      3: ['trip', 'let'],
      4: ['e', 'and', 'a']
    };

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

          var error = function() {
            alert('Stream generation failed.');
          }

          navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;
          navigator.getUserMedia({ audio: true }, gotStream, error);
        } else {
          // input.source.connect(input.audio);
          // audioVisualiser.setInputSource(context, input.audio);
        }
      }
    };

    $scope.slidesSizeChanged = function() {
      audioVisualiser.updateSize();
    };

    $scope.showHelp = function() {
      $mdDialog.show({
        templateUrl: 'views/help/help.html',
        autoWrap: false,
        clickOutsideToClose: true,
        propagateContainerEvents: true
      })
    };

    function drumImageUrl(drum) {
      return '{0}styles/images/{1}.svg'.format(dataUrl, drum.name);
    }

    // Load standard drums kit sounds
    var resources = Drums.Standard.map(function(drum) {
      drum.image = drumImageUrl(drum);
      return drum.filename;
    });
    audioPlayer.bufferLoader.loadResources(resources);
    // Load bongo drums kit sounds
    resources = Drums.Bongo.map(function(drum) {
      drum.image = drumImageUrl(drum);
      return drum.filename;
    });
    audioPlayer.bufferLoader.loadResources(resources);

    // Stop playback when a tab is going to the background (setTimout will not work
    // properly in background tab)
    document.addEventListener('visibilitychange', function(evt) {
      if ($scope.player.playing && document.visibilityState === 'hidden') {
      $scope.player.playing = false;
        audioPlayer.stop();
        $scope.$apply();
      }
    });

    window.workspace = workspace;
    window.pm = projectManager;
    window.audioVisualiser = audioVisualiser;

    // Prevent default context menu
    window.oncontextmenu = function() {
      return false;
    }

  }
})();
