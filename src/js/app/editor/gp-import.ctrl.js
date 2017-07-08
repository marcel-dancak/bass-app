(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('GpImportController', GpImportController)


  function GpImportController($scope, $http, $mdDialog, workspace, projectManager) {

    $scope.gp = JSON.parse(localStorage.getItem('gp.import') || '{}');
    $scope.files = [];
    $scope.tracks = [];
    $scope.close = $mdDialog.hide;

    $http.get('http://localhost:8000/api/gp5/list/').then(function(resp) {
      $scope.files = resp.data;
    });

    var params = {
      // file: 'Locked Out Of Heaven',
      // file: 'The Chic - I Want Your Love',
      // file: 'mb/Julio RnB',
      file: 'Tell Me Baby',
      tracks: '1,8,9,10,11',
      range: '32,43',
      // tracks: '1'
    }

    $scope.getInfo = function(file) {
      if (!file) return;

      $scope.gp.tracks = [];
      $http.get('http://localhost:8000/api/gp5/info/?file='+file)
        .then(function(resp) {
          console.log(resp.data)
          $scope.tracks = resp.data.tracks;
        })
    }
    if ($scope.gp.file) {
      $scope.getInfo($scope.gp.file);
    }

    $scope.import = function() {
      var params = {
        file: $scope.gp.file,
        range: $scope.gp.range
      }
      if ($scope.gp.tracks && $scope.gp.tracks.length) {
        params.tracks = $scope.gp.tracks.join(',')
      }
      localStorage.setItem('gp.import', JSON.stringify($scope.gp));
      console.log(params)

      $http.get('http://localhost:8000/api/gp5/get/', {params: params}).then(function(resp) {
        var tracks = resp.data.tracks;
        window.t = tracks;

        var percussionsTracks = tracks[0];
        var config = {};
        percussionsTracks.forEach(function(track) {
          var t = projectManager.project.tracks.find(function(t) {
            return t.type === 'drums' && t.kit.toLowerCase() === track.type
          });
          if (t) {
            config[t.id] = track;
          } else {
            console.log('Percussion track cannot be imported: '+track.name)
          }
        });

        tracks.slice(1).forEach(function(track) {
          var t = projectManager.project.tracks.find(function(t) {
            return t.type === track.type && !config[t.id];
          });
          if (t) {
            config[t.id] = track;
          } else {
            console.log('Track cannot be imported: '+track.name)
          }
        });

        console.log(config)
        var firstBar = parseInt(params.range.split(',')[0]);
        for (var trackId in config) {
          if (!workspace.section.tracks[trackId]) {
            workspace.initializeNewTrackSection(pm.project.tracksMap[trackId]);
          }
          loadTrack(config[trackId], workspace.section.tracks[trackId], firstBar);
        }
      })
    }

    function loadTrack(track, trackSection, firstBar) {
      firstBar = firstBar || 1;
      var beats = [];
      track.bars.forEach(function(bar, index) {
        var beat = { beat: 0 };
        bar.sounds.forEach(function(sound) {
          if (sound.beat !== beat.beat) {
            // new beat
            beat = {
              // 3 => 5
              bar: bar.bar - firstBar+1,
              // bar: index+1,
              // beat: beat.beat+1,
              beat: sound.beat,
              subdivision: 4,
              data: []
            };
            beats.push(beat);
          }
          delete sound.beat;
          beat.data.push(sound);
        });
      });
      // beats = beats.splice(0,1)
      if (beats.length > 0) {
        console.log(beats);
        (trackSection || workspace.trackSection).loadBeats(beats);
      }
    }
  }
})();