(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('UploadController', UploadController);


  function UploadController($scope, $http, $sce, $mdDialog, projectManager, Config) {
    $scope.close = $mdDialog.hide;
    $scope.window = {};
    var data = projectManager.store._projectData();

    if ($http.user) {
      initializeUpload();
    } else {
      $scope.window = {
        form: 'login',
        title: 'LOGIN'
      };
      $scope.user = {
        username: '',
        password: ''
      };
    }

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

    // data = LZString.compressToBase64(JSON.stringify(data));
    // data = LZString.compressToUTF16(JSON.stringify(data));

    // console.log(LZString.decompressFromBase64(data));

    function collectProjectData() {
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
        level: 3
      }
    }

    function initializeUpload() {
      var uploadId = projectManager.store.project.upload_id;

      $scope.window.title = uploadId ? 'UPDATE' : 'UPLOAD';
      if (uploadId) {
        var projectId = uploadId.split('-')[0];
        $scope.fetching = true;
        $http.get(Config.apiUrl+'project/', { params: {id: projectId} })
          .then(function(resp) {
            if (resp.data.author.id !== $http.user.id) {
              $scope.window.form = 'fork';
              var tag = uploadId.split('-')[1];
              $scope.forks = resp.data.forks.filter(function(fork) {
                return fork.user === $http.user.id;
              });
              $scope.fork = {
                project: projectId,
                tag: tag ? parseInt(tag.replace('v', '')) : ''
              };
            } else {
              collectProjectData();

              // do not override playing_styles
              delete resp.data.playing_styles;
              delete resp.data.tracks;
              // update form with fetched data
              for (var key in resp.data) {
                $scope.project[key] = resp.data[key];
              }
              $scope.descriptionHtml = $sce.trustAsHtml(marked(resp.data.description));
              $scope.window.form = 'upload';
            }
          }, function(resp) {
            // ???
          })
          .finally(function() {
            $scope.fetching = false;
          })
      } else {
        collectProjectData();
        $scope.project.id = projectId;
        $scope.window.form = 'upload';
      }
    }
    
    $scope.login = function() {
      $scope.loginFailed = false;
      $http.post(Config.apiUrl+'login/', $scope.user, {withCredentials: true})
        .then(function(resp) {
          $http.user = resp.data;
          initializeUpload();
        });
    };

    $scope.upload = function() {
      if (data.audioTrack && data.audioTrack.source.resource.startsWith('http://localhost')) {
        if ($scope.project.video_link) {
          data.audioTrack.source = {
            resource: $scope.project.video_link,
            type: 'youtube'
          }
        }
      }

      var upload;
      if ($scope.window.form === 'fork') {
        $scope.fork.data = LZString.compressToBase64(JSON.stringify(data));
        upload = $http.post(Config.apiUrl+'fork/', $scope.fork, {withCredentials: true});
      } else {
        $scope.project.data = LZString.compressToBase64(JSON.stringify(data));
        upload = $http.post(Config.apiUrl+'project/', $scope.project, {withCredentials: true});
      }
      upload.then(function(resp) {
        projectManager.store.project.upload_id = resp.data;
        projectManager.saveProjectConfig();
        $scope.close(true);
      });
      // if (resp.status === 401 || resp.status === 403) {
      //   if (resp.status === 403) {
      //     $http.get(Config.apiUrl+'logout/', {withCredentials: true});
      //   }
      //   $scope.form = "login";
      // }
    }

    var editor;
    $scope.updateEditor = function() {
      var md = editor.toMd();
      $scope.descriptionHtml = $sce.trustAsHtml(marked(md));
      $scope.project.description = md;
    }

    $scope.initializeEditor = function() {
      setTimeout(function() {
        editor = new Pen({
          class: 'description',
          editor: document.querySelector('.markdown-editor'),
          list: ['h1', 'h2', 'bold', 'italic', 'underline', 'insertorderedlist',
                'insertunorderedlist', 'superscript', 'subscript', 'createlink']
        });
      }, 200);
    }
  }

})();