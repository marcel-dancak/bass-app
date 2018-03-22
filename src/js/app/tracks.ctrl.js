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
    $scope.offset = undefined;
    $scope.addOffset = function(offset) {
      workspace.playlist.items.forEach(function(item, index) {
        workspace.playlist.syncAudioTrack[index].forEach(function(time, i) {
          time.start[2] += offset;
          $scope.updatePlayistItemTime(item, i, time) ;
        });
      });
      // workspace.playlist.syncAudioTrack.forEach(function(group) {
      //   group.forEach(function(item) {
      //     console.log(item)
      //     item.start[2] += offset;
      //   })
      // });
      // workspace.playlist.updateSyncTimes();
    }
  }

  function TracksController($scope, $mdUtil, $mdDialog, $mdPanel, mdPanelRef,
      context, workspace, audioPlayer, audioVisualiser, projectManager, player, dragablePanel) {
    $scope.runtime = window.runtime;
    $scope.player = player;
    $scope.project = projectManager.project;
    $scope.workspace = workspace;
    $scope.input = audioPlayer.input;

    var maxGain = {
      bass: 6,
      drums: 3,
      piano: 2
    };
    $scope.volumeSliderOpts = function(track) {
      var ceil = maxGain[track.type] || 1;
      if (ceil > 1) {
        return {
          floor: 0,
          ceil: ceil,
          step: 0.01,
          precision: 2,
          customPositionToValue: $scope.volumePositionToValue,
          customValueToPosition: $scope.volumeValueToPosition,
          showTicks: true,
          ticksArray: [1],
          hideLimitLabels: true,
          hidePointerLabels: true,
          showSelectionBar: true,
          disabled: track.audio.muted
        };
      }
      return {
        floor: 0,
        ceil: ceil,
        step: 0.01,
        precision: 2,
        hideLimitLabels: true,
        hidePointerLabels: true,
        showSelectionBar: true,
        disabled: track.audio.muted
      };
    };

    $scope.volumeValueToPosition = function(val, minVal, maxVal) {
      if (val < 1) {
        return 0.75 * val;
      } else {
        return 0.75 + 0.25*(val-1)/(maxVal - 1);
      }
    }
    $scope.volumePositionToValue = function(percent, minVal, maxVal) {
      if (percent < 0.75) {
        return percent/0.75;
      }
      return 1 + ((percent-0.75)/0.25)*(maxVal-1);
    }

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

    $scope.toggleSolo = function(track) {

      track.solo = !track.solo;
      var tracks = projectManager.project.tracks.concat();
      if (projectManager.project.audioTrack) {
        tracks = tracks.concat(projectManager.project.audioTrack);
      }
      var soloOn = tracks.find(function(t) {
        return t.solo;
      });
      if (soloOn) {
        tracks.forEach(function(t) {
          if (!t.solo) {
            t.audio.active = false;
          } else {
            t.audio.active = true;
          }
        });
      } else {
        tracks.forEach(function(t) {
          t.audio.active = true;
        });
      }
    };

    $scope.setFilter = function(track, on) {
      console.log('setFilter: '+on)
      var audio = track.audio;
      var hasFilterNode = Boolean(audio.filter.context);

      if (on) {
        if (!hasFilterNode) {
          audio.filter = context.createBiquadFilter();
          audio.filter.frequency.value = 700;
          audio.add(audio.filter);
        } else {
          audio.filter.active = true;
        }
      } else {
        audio.filter.active = false;
      }
    }


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
      projectManager.addUrlStreamTrack(file.content, {type: 'file'});
    };

    $scope.addYoutubeTrack = function() {
      var initial = projectManager.project.audioTrack ? projectManager.project.audioTrack.source.resource : ''
      var prompt = $mdDialog.prompt()
        .title('Online Stream')
        .textContent('Enter Youtube video or other supported online stream resource')
        .placeholder('Youtube video, SoundCloud track, ...')
        .initialValue(initial)
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
          if (projectManager.project.audioTrack) {
            projectManager.removeAudioTrack();
          }
          projectManager.addOnlineStreamTrack(resource);
          initializeSectionStart();
        })
        .catch(function(err) {
          console.log(err)
        });
    };

    $scope.removeAudioTrack = projectManager.removeAudioTrack.bind(projectManager);
    initializeSectionStart();

    $scope.toggleYoutubeTrack = function() {
      var project = projectManager.project;
      /*
      if (project.audioTrack && project.audioTrack.source.type === 'youtube') {
        projectManager.removeAudioTrack();
      } else {
        if (project.audioTrack) {
          projectManager.removeAudioTrack();
        }
        $scope.addYoutubeTrack();
      }
      */
      $scope.addYoutubeTrack();
    }

    $scope.toggleFileTrack = function() {
      var project = projectManager.project;
      if (project.audioTrack && project.audioTrack.source.type === 'file') {
        projectManager.removeAudioTrack();
      } else {
        if (project.audioTrack) {
          projectManager.removeAudioTrack();
        }
        $scope.addYoutubeTrack();
      }
    }

    $scope.openSyncPreferences = function(evt) {
      var box = evt.target.getBoundingClientRect();
      var position = $mdPanel.newPanelPosition();
      if (window.runtime.desktop) {
        position
          .relativeTo(evt.target)
          .addPanelPosition($mdPanel.xPosition.ALIGN_START, $mdPanel.yPosition.ALIGN_TOPS);
      } else {
        position
          .absolute()
          .center();
      }

      var animation = $mdPanel.newPanelAnimation()
        .withAnimation($mdPanel.animation.FADE);

      if (!mdPanelRef.detached) {
        mdPanelRef.close();
      }

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
      });
    };

    $scope.detachPanel = function() {
      console.log(mdPanelRef);
      var bounds = mdPanelRef.panelEl[0].getBoundingClientRect();
      mdPanelRef.panelContainer.css('pointerEvents', 'none');
      mdPanelRef.panelEl.css('pointerEvents', 'auto');
      dragablePanel.makeDragable(mdPanelRef, '.toolbar');
      mdPanelRef.detached = true;
    };
    $scope.closePanel = mdPanelRef.close.bind(mdPanelRef);

    $scope.frequencyLabel = function(value) {
      if (value >= 1000) {
        return (value/1000).toFixed(2).replace('.00', '')+'k'
      }
      return value;
    }

    $scope.showVideo = function() {
      console.log('showVideo');
      console.log(projectManager.project.audioTrack._stream)
      dragablePanel.open({
        id: 'video',
        attachTo: document.body,
        // contentElement: projectManager.project.audioTrack._stream,
        templateUrl: 'views/video_window.html',
        onDomAdded: function(args) {
          var panel = args[1].panelEl;
          console.log(panel);
          panel.children().append(projectManager.project.audioTrack._stream);
        }
      });
    };
  }
})();
