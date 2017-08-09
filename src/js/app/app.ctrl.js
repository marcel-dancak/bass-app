(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('AppController', AppController)
    .value('context', new AudioContext())
    .value('workspace', {})
    .value('settings', {
      fretboard: {
        size: 19
      }
    })
    .constant('Note', {
      Whole: {
        label: 'WHOLE',
        symbol: 'whole-note',
        value: 1
      },
      Half: {
        label: 'HALF',
        symbol: 'half-note',
        value: 2
      },
      Quarter: {
        label: 'QUARTER',
        symbol: 'quarter-note',
        value: 4
      },
      Eighth: {
        label: 'EIGHTH',
        symbol: 'eighth-note',
        value: 8
      },
      Sixteenth: {
        label: 'SIXTEENTH',
        symbol: 'sixteenth-note',
        value: 16
      },
      ThirtySecond: {
        label: 'THIRTYSECOND',
        symbol: 'thirty-second-note',
        value: 32
      }
    })
    .run(function($mdDialog) {
      window.runtime = {};
      window.runtime.mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent);
      // window.runtime.mobile = true;
      window.runtime.desktop = !window.runtime.mobile;
      // window.addEventListener("orientationchange", adjustScale);
      // window.addEventListener("resize", function() {});

      if (!window.chrome) {
        var alert = $mdDialog.alert()
        .title('Warning')
        .textContent(
          'It is highly recommended to use Blink/Webkit based browser (Chrome, Chromium, Opera). '+
          'Application may not work properly in other browsers.'
        )
        .ok('Close');

        $mdDialog.show(alert);
      }
    })
    .directive('prettyScrollbar', prettyScrollbar)
    .config(function($mdThemingProvider) {
      $mdThemingProvider.theme('default')
        .primaryPalette('blue')
        .accentPalette('blue-grey');
    })
    // Support for loading of AngularJS components after application has been bootstrapped
    .config(function($controllerProvider, $provide, $compileProvider) {
      angular.module('bd.app').controller = function(name, constructor) {
        $controllerProvider.register(name, constructor);
        return(this);
      };
    })
    // Disable tooltips on touch devices
    .directive('mdTooltip', function() {
      return {
        replace: true,
        template: '<span style="display:none"></span>',
        scope: {}, //create an isolated scope
        link: function(scope, element) {
           element.remove();
           scope.$destroy();
        }
      };
    })
    .decorator('mdTooltipDirective',function($delegate) {
      return [$delegate[window.runtime.mobile? 1 : 0]];
    });

  function prettyScrollbar() {
    return {
      scope: false,
      link: function(scope, iElem, iAttrs, ctrl) {
        if (window.SimpleScrollbar && SimpleScrollbar.width > 0) {
          SimpleScrollbar.initEl(iElem[0], iAttrs.glScrollbar);
        } else {
          iElem.css('overflow', 'auto');
        }
      }
    }
  }

  function AppController($scope, $q, $timeout, $translate, $http, $controller, $mdUtil, $mdToast, $mdDialog,  $mdSidenav, $mdPanel, $location, context,
      settings, workspace, audioPlayer, audioVisualiser, projectManager, Drums, Note,
      dataUrl, localSoundsUrl, soundsUrl) {
    $scope.runtime = window.runtime;
    $scope.Note = Note;
    $scope.settings = settings;

    $scope.language = 'en';
    $scope.setLanguage = function(code) {
      $scope.language = code;
      $translate.use(code);
      localStorage.setItem('preferences.lang', code);
    };
    var lang = localStorage.getItem('preferences.lang');
    if (lang) {
      $scope.setLanguage(lang);
    }

    $scope.ui = {
      selectTrack: angular.noop,
      playlist: {}
    };

    $scope.fullScreen = {
      active: false,
      toggle: function() {
        var isFullscreen = window.fullScreen || document.webkitFullscreenElement;
        if (isFullscreen) {
          var exitFn = document.mozFullScreen !== undefined? 'mozCancelFullScreen' : 'webkitCancelFullScreen';
          document[exitFn]();
        } else {
          var enterFn = document.mozFullScreen !== undefined? 'mozRequestFullScreen' : 'webkitRequestFullscreen';
          document.body[enterFn]();
          // setTimeout(window.adjustScale, 500);
        }
      }
    };

    $scope.player = {
      mode: $location.hash()? 1 : 0,
      playing: false,
      play: angular.noop,
      countdown: false,
      loop: true,
      speed: 100,
      playbackRange: {
        start: 1,
        end: 1,
        max: 1
      },
      playbackRangeChanged: angular.noop,
      progress: {
        max: 0,
        value: 0
      },
      setProgress: angular.noop,
      graphEnabled: false,
      visibleBeatsOnly: false,
      playlist: []
    };
    $scope.playlistLabel = function(value) {
      var label = $scope.player.playlist[value-1];
      return label;
      // return '({0}) {1}'.format(value, label);
    };

    function handleSoundSampleError() {
      audioPlayer.bufferLoader.onError = function() {
        $mdToast.show(
          $mdToast.simple()
            .toastClass('error')
            .textContent('Failed to load sound sample!')
            .position('bottom center')
        );
      };
    }
    // check local sounds server and switch to public server when unavailable
    audioPlayer.bufferLoader = new BufferLoader(context, localSoundsUrl);
    audioPlayer.bufferLoader.loadResource(
      'sounds/drums/drumstick',
      handleSoundSampleError,
      function() {
        audioPlayer.bufferLoader.serverUrl = soundsUrl;
        handleSoundSampleError()
      }
    );

    audioPlayer.fetchResourcesWithProgress = function(resources) {
      var task = $q.defer();
      $scope.player.loading = true;
      this.fetchResources(resources)
        .then(
          function() {
            // $scope.player.loading = false;
            task.resolve();
          },
          task.reject)
        .finally(function() {
          $scope.player.loading = false;
        });
      return task.promise;
    }
    // initial volume for input after un-mute
    audioPlayer.input._volume = 0.75;

    $scope.bass = {
      playingStyles: [
        {
          name: 'finger',
          label: 'FINGER'
        }, {
          name: 'slap',
          label: 'SLAP'
        }, {
          name: 'pop',
          label: 'POP'
        }, {
          name: 'pick',
          label: 'PICK'
        }, {
          name: 'tap',
          label: 'TAP'
        }, {
          name: 'hammer',
          label: 'HAMMER_ON'
        }, {
          name: 'pull',
          label: 'PULL_OFF'
        }, {
          name: 'ring',
          label: 'LET_RING'
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
    if (window.runtime.mobile) {
      $scope.barLabels[4][1] = '&';
    }

    Object.defineProperty(Note, 'map', {value: 'static', writable: true});
    Note.map = {};
    for (var key in Note) {
      var note = Note[key];
      Note.map[note.value] = note.symbol;
    }
    $scope.Note = Note;

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

    $scope.initSliders = function() {
      $scope.$broadcast('rzSliderForceRender');
    };

    // Assign isons for Drums/Percussions
    Drums.Drums.icon = 'drums';
    Drums.Percussions.icon = 'percussions';

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
    window.av = audioVisualiser;

    window.addEventListener('keydown', function(e) {
      if (e.ctrlKey && e.key === 'i') {
        $mdDialog.show({
          templateUrl: 'views/editor/gp_import.html',
        });
      }
    });

    // Prevent default context menu
    window.oncontextmenu = function() {
      return false;
    }


    function loadScript(ngTempl) {

      var scope = $scope.$new(true);

      var template = angular.element('<div>'+ngTempl+'</div>');

      var dependenciesLoaded = $q.when();

      // fetch list of already loaded JS scripts
      var currentScripts = Array.from(
          document.querySelectorAll('script[src]')
        ).map(function(elem) {
          return elem.src;
        });

      // JavaScript Dependencies (filter only not loaded yet)
      var scriptElems = Array.from(
          template[0].querySelectorAll('script[src]')
        ).filter(function(elem) {
          return currentScripts.indexOf(elem.src) === -1;
        });

      if (scriptElems.length) {
        var loading = $q.defer();
        dependenciesLoaded = loading.promise;
        var loaded = 0;
        scriptElems.forEach(function(scriptElem) {
          var script = document.createElement('script');
          script.type = 'text/javascript';
          script.src = scriptElem.src;
          script.onload = function() {
            console.log('loaded: '+script.src)
            if (++loaded === scriptElems.length) {
              loading.resolve();
            }
          }
          document.body.appendChild(script);
        });
      }
      var scriptElems = template[0].querySelectorAll('script:not([src])');
      Array.from(scriptElems).forEach(function(scriptTempl, index) {
        var scriptEl = document.createElement('script');
        scriptEl.type = 'text/javascript';
        if (index === 0) {
          scriptEl.innerHTML = '(function() {{ angular.module("bd.app").controller("ScriptCtrl", {0}) }})()'
          .format(scriptTempl.text);
        } else {
          scriptEl.innerHTML = scriptTempl.text;
        }
        document.body.appendChild(scriptEl);
      });
      document.body.appendChild(template.find('style')[0]);

      dependenciesLoaded.then(function() {
        $controller('ScriptCtrl', {'$scope': $scope.$new(true), 'template': template});
      });
    }

    projectManager.on('projectLoaded', function(project) {

      // $http.get('intervals.html').then(function(resp) {
      //   loadScript(resp.data);
      //   projectManager.store.project.script = resp.data;
      // });
      if (project.script) {
        loadScript(project.script);
      }
    });


    function SideMenu() {
      var that = {
        selectMenu: {
          widget: null,
          items: [],
          open: function(opts) {
            that.selectMenu.items = opts.items.map(function(item) {
              return item[opts.label];
            });
            that.selectMenu.callback = function(index) {
              if (opts.onSelect) {
                var value = opts.items[index];
                if (opts.value) {
                  value = value[opts.value];
                }
                return opts.onSelect(value);
              }
            };
            that.selectMenu.widget = $mdSidenav('menu-select');
            that.selectMenu.widget.toggle();
          }
        },
        open: function() {
          var sidenav = $mdSidenav('menu');
          sidenav.toggle().then($scope.initSliders);
          sidenav.onClose(function() {
            if (that.selectMenu.widget) {
              that.selectMenu.widget.close();
              that.selectMenu.widget = null;
            }
          });
        }
      };
      return that;
    }
    $scope.sideMenu = SideMenu();


    function panelMenu(template, evt, opts) {
      var position = $mdPanel.newPanelPosition()
        .relativeTo(evt.target)
        .addPanelPosition($mdPanel.xPosition.ALIGN_START, $mdPanel.yPosition.ALIGN_TOPS)

      var animation = $mdPanel.newPanelAnimation()
        .openFrom(evt.target)
        .closeTo(evt.target)
        .withAnimation({
            open: 'menu-animation-enter',
            close: 'menu-animation-leave'
          })

      $mdPanel.open({
        attachTo: document.body,
        templateUrl: template,
        // controller: 'TracksController',
        position: position,
        animation: animation,
        targetEvent: evt,
        panelClass: 'menu md-whiteframe-16dp',
        clickOutsideToClose: true,
        // onCloseSuccess
        onDomRemoved: function(arg) {
          arg[0].destroy();
        }
      });
    }

    $scope.openVolumePreferences = function(evt) {
      panelMenu('views/volume_preferences.html', evt);
    }
  }
})();
