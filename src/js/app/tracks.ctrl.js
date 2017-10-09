(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('TracksController', TracksController)
    .controller('SyncController', SyncController);


  function numPad(n, p) {
    var str = ''+n;
    while (str.length < p) {
      str = '0'+str;
    }
    return str;
  }

  function sectionEnd(section) {
    var beats = section.length * section.timeSignature.top;
    var duration = beats * (60 / (section.audioTrack.bpm || section.bpm));
    var time = section.audioTrack.start.slice();
    var sec = parseInt(duration);
    var mili = Math.round(1000 * (duration - sec));
    time[1] += sec;
    time[2] += mili;
    if (time[2] >= 1000) {
      time[1]++;
      time[2] -= 1000;
    }
    return time;
  }
  function formatTime(value) {
    return '{0}:{1}:{2}'.format(numPad(value[0], 1), numPad(value[1], 2), numPad(value[2], 3));
  }

  function SyncController($scope, projectManager, workspace, player) {
    $scope.runtime = window.runtime;
    $scope.player = player;
    $scope.workspace = workspace;
    $scope.project = projectManager.project;

    $scope.beatDuration = function() {
      var bpm = workspace.section.audioTrackBpm || workspace.section.bpm;
      return (60 / bpm).toFixed(3);
    }
    $scope.sectionDuration = function() {
      var s = workspace.section;
      var bpm = s.audioTrackBpm || s.bpm;
      var beats = s.length * s.timeSignature.top;
      return (beats * (60 / bpm)).toFixed(3);
    }
    $scope.sectionEnd = function() {
      return formatTime(sectionEnd(workspace.section));
    }
    $scope.formatTime = formatTime;

    $scope.sectionsNames = {};
    projectManager.project.sections.forEach(function(s) {
      $scope.sectionsNames[s.id] = s.name;
    });

    function updatePlaylistItemData(item, index, data) {
      if (!item.syncTimes) {
        item.syncTimes = {};
      }
      if (!item.syncTimes[index]) {
        item.syncTimes[index] = {};
      }
      Object.assign(item.syncTimes[index], data);
    }
    $scope.updatePlayistItemTime = function(item, index, time) {
      updatePlaylistItemData(item, index, {start: time.start});
      workspace.playlist.updateSyncTimes();
    };

    $scope.removeGap = function(item, index, time) {
      if (item.syncTimes && item.syncTimes[index] && item.syncTimes[index].start) {
        delete item.syncTimes[index].start;
      } else {
        updatePlaylistItemData(item, index, {start: time.prevEnd});
      }
      workspace.playlist.updateSyncTimes();
    };
    $scope.initializePlayistItemBpm = function(item, index, time) {
      if (!time.bpm) {
        time.bpm = time.originalBpm;
      }
    }
    $scope.updatePlayistItemBpm = function(item, index, time) {
      updatePlaylistItemData(item, index, {bpm: time.bpm});
      workspace.playlist.updateSyncTimes();
    };
    $scope.validatePlayistItemBpm = function(item, index, time) {
      if (time.bpm === time.originalBpm) {
        delete time.bpm;
        if (item.syncTimes && item.syncTimes[index]) {
          delete item.syncTimes[index].bpm;
        }
      }
    };
  }

  function TracksController($scope, $mdUtil, $mdDialog, $mdPanel, mdPanelRef,
      context, workspace, audioPlayer, audioVisualiser, projectManager, player, dragablePanel) {
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

    function initializeSectionStart() {
      // initialize audioTrackStart model
      if (workspace.section && !workspace.section.audioTrack) {
        workspace.section.audioTrack = {
          start: [0, 0, 0]
        };
      }
    }

    $scope.addFileAudioTrack = function(file) {
      initializeSectionStart();
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
          initializeSectionStart();
        })
        .catch(angular.noop);
    };

    $scope.removeAudioTrack = projectManager.removeAudioTrack.bind(projectManager);
    initializeSectionStart();

    $scope.syncInfo = function() {
      if (workspace.section.audioTrack && workspace.section.audioTrack.start) {
        return '{0} - {1}'.format(
          formatTime(workspace.section.audioTrack.start),
          formatTime(sectionEnd(workspace.section))
        );
      }
    }

    $scope.openSyncPreferences = function(evt) {
      var box = evt.target.getBoundingClientRect();
      var position = $mdPanel.newPanelPosition()
        .relativeTo(evt.target)
        .addPanelPosition($mdPanel.xPosition.ALIGN_START, $mdPanel.yPosition.ALIGN_TOPS)

      var animation = $mdPanel.newPanelAnimation()
        .withAnimation($mdPanel.animation.FADE);

      mdPanelRef.close();
      dragablePanel.open({
        id: 'volume',
        attachTo: document.body,
        templateUrl: 'views/audio_track.html',
        controller: 'SyncController',
        position: position,
        animation: animation,
        locals: {
          player: $scope.player
        },
      })//.then(mdPanelRef.close.bind(mdPanelRef));
      .then(function(panel) {
        // delete position after first use to fix weird issues on scroll
        delete panel.config.position
      })
    }
  }
})();
