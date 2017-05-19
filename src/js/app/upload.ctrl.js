(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('UploadController', UploadController);


  function UploadController($scope, $http, $sce, $mdDialog, projectManager, uploadUrl) {
    console.log('-- UploadController --')
    // if (projectManager.store)

    $scope.close = $mdDialog.hide;
    $scope.showLogin = false;
    $scope.form = "upload";
    $scope.user = {
      username: '',
      password: ''
    };
    $scope.transformChip = function(chip) {
      console.log('transformChip')
    };
    var genres = [
      'Funk', 'Rock', 'Pop', 'Jazz', 'Acid Jazz', 'Soul', 'RnB', 'Disco', 'Blues',
      'Punk', 'Ska', 'House', 'Reggae', 'Hip hop', 'Trance', 'Gospel',
      'Country', 'Folk', 'Indie', 'Alternative', 'Metal', 'Techno', 'Rock and Roll',
      'Merengue', 'Salsa'
    ];
    $scope.difficulties = [
      {
        numeric: 0,
        title: 'Very Easy'
      }, {
        numeric: 1,
        title: 'Easy'
      }, {
        numeric: 2,
        title: 'Easy/Medium'
      }, {
        numeric: 2.5,
        title: 'Medium'
      }, {
        numeric: 3,
        title: 'Medium/Hard'
      }, {
        numeric: 4,
        title: 'Hard'
      }, {
        numeric: 5,
        title: 'Very Hard'
      }
    ]
    $scope.querySearch = function(text) {
      var query = text.toLowerCase();
      return genres.filter(function(item) {
        return item.toLowerCase().indexOf(query) !== -1;
      });
    };

    var data = projectManager.store._projectData();
    // data = LZString.compressToBase64(JSON.stringify(data));
    // data = LZString.compressToUTF16(JSON.stringify(data));

    // console.log(LZString.decompressFromBase64(data));

    // analyze project data
    var styles = new Set();
    var tracks = new Set();
    data.sections.forEach(function(sectionData) {
      for (var trackId in sectionData.tracks) {
        if (!projectManager.project.tracksMap[trackId]) {
          // deleted track
          continue;
        }
        var trackType = trackId.split('_')[0];
        tracks.add(trackType)
        if (trackType === 'bass') {
          var trackBeats = sectionData.tracks[trackId];
          trackBeats.forEach(function(trackBeat) {
            var sounds = trackBeat.data;
            sounds.forEach(function(sound) {
              // Backward compatibility is here
              styles.add(sound.sound? sound.sound.style : sound.style);
            });
          });
        }
      }
    });

    var playingStyles = [];
    var techniques = ['finger', 'slap', 'tap', 'pick'];
    styles.forEach(function(style) {
      if (techniques.indexOf(style) !== -1) {
        playingStyles.push(style.charAt(0).toUpperCase() + style.slice(1));
      }
    });

    $scope.project = {
      title: projectManager.project.name,
      category: 'Cover',
      playing_styles: playingStyles,
      genres: [],
      tracks: Array.from(tracks),
      tags: [],
      // data: data,
      data: LZString.compressToBase64(JSON.stringify(data)),
      level: 3
    }

    var uploadId = projectManager.store.project.upload_id;
    $scope.newUpload = !Boolean(uploadId);
    if (uploadId) {
      $scope.fetching = true;
      $http.get(uploadUrl+'project/', { params: {id: uploadId} })
        .then(function(resp) {
          // do not override playing_styles
          delete resp.data.playing_styles;
          delete resp.data.tracks;
          // update form with fetched data
          for (var key in resp.data) {
            $scope.project[key] = resp.data[key];
          }
          $scope.descriptionHtml = $sce.trustAsHtml(marked(resp.data.description));
        }, function(resp) {

        })
        .finally(function() {
          $scope.fetching = false;
        })
    }
    
    $scope.login = function() {
      $scope.loginFailed = false;
      $http.post(uploadUrl+'login/', $scope.user, {withCredentials: true})
        .then($scope.upload, function(resp) {
          $scope.loginFailed = true;
        })
    };

    $scope.upload = function() {
      $http.post(uploadUrl+'project/', $scope.project, {withCredentials: true})
        .then(function(resp) {
          projectManager.store.project.upload_id = resp.data;
          projectManager.saveProjectConfig();
          $scope.close(true);

        }, function(resp) {
          if (resp.status === 401 || resp.status === 403) {
            if (resp.status === 403) {
              $http.get(uploadUrl+'logout/', {withCredentials: true});
            }
            $scope.showLogin = true;
            $scope.form = "login";
          }
        })
    }

    var editor;
    $scope.updateEditor = function() {
      var md = editor.toMd();
      $scope.descriptionHtml = $sce.trustAsHtml(marked(md));
      $scope.project.description = md;
    }

    setTimeout(function() {
      editor = new Pen({
        class: 'description',
        editor: document.querySelector('.markdown-editor'),
        list: ['h1', 'h2', 'bold', 'italic', 'underline', 'insertorderedlist',
              'insertunorderedlist', 'superscript', 'subscript', 'createlink']
      });
    }, 200);
  }

})();