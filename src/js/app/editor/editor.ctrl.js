(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('MetadataController', MetadataController)
    .controller('EditModeController', EditModeController);


    function MetadataController($scope, workspace, mdPanelRef, projectManager, updateChordLabels) {
      function reorderChords() {
        // ensure correct chords order
        $scope.section.meta.chords.sort(function(a, b) {
          var aValue = a.start[0]*1000 + a.start[1]*10 + a.start[2];
          var bValue = b.start[0]*1000 + b.start[1]*10 + b.start[2];
          return aValue - bValue;
        });
      }

      function selectFirst() {
        if ($scope.section.meta.chords.length) {
          $scope.selectChord($scope.section.meta.chords[0]);
        }
      }

      function setSection(section) {
        if (!section.meta) {
          section.meta = {
            chords: []
          };
        }
        $scope.section = section;
        $scope.form = {
          chord: null, // selected chord item
          root: ''
        };
        selectFirst();
      }

      $scope.track = workspace.track;

      $scope.close = function() {
        reorderChords();
        mdPanelRef.close();
        projectManager.un('sectionLoaded', setSection);
      };

      $scope.selectChord = function(chord) {
        if (!chord.string) {
          chord.string = 'E';
        }
        $scope.form.chord = chord;
        $scope.form.root = chord.root;
      };


      $scope.updatePosition = function() {
        updateChordLabels();
        reorderChords();
      };
      $scope.updateChord = function() {
        var chord = $scope.form.chord;
        if ($scope.form.root) {
          var label = $scope.form.root.replace('#', '♯').replace('b', '♭');
          chord.root = label;
          var octave = parseInt(label[label.length-1]);
          if (Number.isInteger(octave)) {
            chord.root = label.substring(0, label.length-1);
            chord.octave = octave;
          } else if (!Number.isInteger(chord.octave)) {
            // select first octave
            var string = $scope.track.instrument.strings[$scope.form.chord.string];
            var note = string.notes.find(function(note) {
              return note.label[0] === label || note.label[1] === label;
            });
            if (note) {
              chord.octave = note.octave;
            }
          }
          $scope.form.root = chord.root;
        }
        updateChordLabels();
      };

      $scope.newChord = function() {
        var newChord = {start: [1,1,1]};
        $scope.section.meta.chords.push(newChord);
        $scope.selectChord(newChord);
      };

      $scope.keyPressed = function(evt) {
        if (evt.keyCode === 46) {
          var index = $scope.section.meta.chords.indexOf($scope.form.chord);
          if (index !== -1) {
            $scope.form.chord = null;
            $scope.section.meta.chords.splice(index, 1);
            selectFirst();
            updateChordLabels();
          }
        }
      };

      setSection(workspace.section);
      projectManager.on('sectionLoaded', setSection);
    }


  function EditModeController($scope, $mdUtil, $mdToast, $mdPanel, context, workspace, audioPlayer, audioVisualiser,
              projectManager, Drums, BassSection, DrumSection, HighlightTimeline, swiperControl, fretboardViewer) {

    $scope.swiperControl = swiperControl;
    $scope.slides = [];
    audioPlayer.setPlaybackSpeed(1);


    function isLoopNeeded() {
      var playbackRange = swiperControl.lastSlide-swiperControl.firstSlide + 1;
      if (playbackRange > workspace.section.beatsPerView) {
        return true;
      }
    }

    $scope.player.visiblePlaybackModeChanged = function(visibleBeatsOnly) {
      // return;
      if (visibleBeatsOnly) {
        var updated = updateLockedPlayerRange();
        if (!updated) {
          $scope.player.visibleBeatsOnly = false;
          $mdToast.show(
            $mdToast.simple()
              .toastClass('error player')
              .textContent('Cannot lock playback on current possition!')
              .position('top center')
          );
          return;
        }
        // TODO: swiper slide size change also affect updateLockedPlayerRange
        swiperControl.barSwiper.on('transitionEnd', updateLockedPlayerRange);
      } else {
        swiperControl.barSwiper.off('transitionEnd', updateLockedPlayerRange);
        if ($scope.player.loop) {
          swiperControl.destroyLoop();
        }
        $scope.player.playbackRangeChanged();
        if ($scope.player.playing && $scope.player.loop && isLoopNeeded()) {
          swiperControl.createLoop();
        }
      }
    };

    $scope.player.playbackRangeChanged = function() {
      console.log('playbackRangeChanged');
      var barBeatsCount = workspace.section.timeSignature.top;
      var firstBar = $scope.player.playbackRange.start;
      var lastBar = $scope.player.playbackRange.end - 1;
      audioPlayer.playbackRange = {
        start: {
          bar: firstBar,
          beat: 1
        },
        end: {
          bar: lastBar,
          beat: workspace.section.timeSignature.top
        }
      };
      var firstBeat = (firstBar - 1) * barBeatsCount;
      var lastBeat = (lastBar) * barBeatsCount - 1;
      swiperControl.setVisibleRange(firstBeat, lastBeat);

      $scope.player.progress.max = lastBeat - firstBeat;
      var barTicks = [];
      for (var i = barBeatsCount; i < $scope.player.progress.max; i+= barBeatsCount) {
        barTicks.push(i);
      }
      $scope.player.progress.ticks = barTicks;
      $scope.player.progress.legend = function(value) {
        return 1 + (value / barBeatsCount);
      }
    }


    timeline = new HighlightTimeline(swiperControl);

    $scope.ui.bpmChanged = function(value) {
      if (value) {
        audioPlayer.setBpm(workspace.section.bpm);
      }
    };

    $scope.player.setProgress = function(id, value) {
      if (!$scope.player.playing) {
        swiperControl.barSwiper.slideTo(value, 0, true);
      }
    };

    function beatPrepared(evt) {
      if (!$scope.player.visibleBeatsOnly) {
        var slide = evt.flatIndex - swiperControl.firstSlide;
        var timeToBeat = evt.startTime - evt.eventTime;
        // console.log(slide-$scope.barSwiper.activeIndex);
        // console.log(timeToBeat);
        setTimeout(function() {
          swiperControl.slideTo(
            slide,
            workspace.section.animationDuration,
            true
          );
        }, parseInt(timeToBeat*1000));
      }

      if (!audioVisualiser.enabled && $scope.player.graphEnabled) {
        var audio = $scope.player.input.muted? workspace.track.audio : $scope.player.input.audio;
        console.log('activating track visualization');
        audioVisualiser.activate(audio);
      }
      if (audioVisualiser.enabled && !$scope.player.graphEnabled) {
        audioVisualiser.deactivate();
      }
      if (audioVisualiser.enabled) {
        audioVisualiser.beatSync(evt);
      }

      timeline.beatSync(evt);
      fretboardViewer.beatSync(evt);

      $mdUtil.nextTick(function() {
        $scope.player.progress.value = evt.flatIndex - swiperControl.firstSlide;
      });
    }

    function updateLockedPlayerRange() {
      console.log('** updateLockedPlayerRange');
      var maxIndex = swiperControl.lastSlide;
      // var sFlatIndex = swiperControl.barSwiper.snapIndex
      var sFlatIndex = swiperControl.firstSlide + swiperControl.barSwiper.snapIndex * workspace.section.beatsPerSlide;
      var eFlatIndex = sFlatIndex + workspace.section.beatsPerView - 1;

      if (eFlatIndex > maxIndex) {
        // invalid range for playback lock
        return false;
      }
      audioPlayer.playbackRange = {
        start: {
          bar: parseInt(sFlatIndex / workspace.section.timeSignature.top) + 1,
          beat: (sFlatIndex % workspace.section.timeSignature.top) + 1
        },
        end: {
          bar: parseInt(eFlatIndex / workspace.section.timeSignature.top) + 1,
          beat: (eFlatIndex % workspace.section.timeSignature.top) + 1
        }
      };
      return true;
    }

    var timeline;
    $scope.player.play = function() {
      if ($scope.player.visibleBeatsOnly) {
        updateLockedPlayerRange();
      } else {
        swiperControl.reset();

        if ($scope.player.loop && isLoopNeeded()) {
          swiperControl.createLoop();
        }
      }
      $scope.player.playing = true;
      audioPlayer.setBpm(workspace.section.bpm);
      timeline.start();

      audioPlayer.fetchResourcesWithProgress(workspace.section)
        .then(
          audioPlayer.play.bind(
            audioPlayer,
            workspace.section,
            beatPrepared,
            playbackStopped,
            $scope.player.countdown
          ),
          function() {$scope.player.playing = false}
        );

    };

    $scope.player.stop = function() {
      $scope.player.playing = false;
      audioPlayer.stop();
    };

    function playbackStopped() {
      if ($scope.player.playing && $scope.player.loop) {
        // loop mode
        if (!swiperControl.loopMode && !$scope.player.visibleBeatsOnly && isLoopNeeded()) {
          swiperControl.createLoop();
          swiperControl.reset();
        }
        audioPlayer.play(workspace.section, beatPrepared, playbackStopped);
        return;
      }
      if (swiperControl.loopMode) {
        swiperControl.destroyLoop();
      }
      $scope.player.playing = false;
      audioVisualiser.deactivate();
      timeline.stop();
    }
    // audioPlayer.on('playbackStopped', playbackStopped);


    $scope.playDrumSound = function(drumName) {
      var sound = {
        drum: drumName,
        volume: 0.85
      };
      audioPlayer.playDrumSample(workspace.track, sound);
    };

    $scope.playPianoSound = function(note) {
      var sound = {
        note: {
          name: note.label[0],
          octave: note.octave,
          length: 1/2
        },
        string: note.label[0]+note.octave,
        volume: 0.85
      };
      audioPlayer.playPianoSample(workspace.track, sound);
    };

    function createSlides(trackSection) {
      var timeSignature = workspace.section.timeSignature;

      var slides = [];
      trackSection.forEachBeat(function(beat) {
        var slideId = beat.bar+'_'+beat.beat;
        slides.push({
          id: slideId,
          beat: beat,
          type: workspace.track.type,
          beatLabel: workspace.section.beatLabels? workspace.section.beatLabels[beat.beat] : beat.beat
        });
      });
      $scope.slides = slides;
    }

    function updateSwiperSlides() {
      $mdUtil.nextTick(function() {
        swiperControl.setSlides($scope.slides, {
          slidesPerView: workspace.section.beatsPerView,
          slidesPerGroup: workspace.section.beatsPerSlide
        });
        $scope.player.playbackRangeChanged();
      });
    }

    $scope.initializeWorkspace = function(bassTrack, drumsTrack) {
      workspace.bassSection = new BassSection(workspace.section);
      workspace.drumSection = new DrumSection(workspace.section);
      assignTrack(workspace.bassSection, bassTrack);
      assignTrack(workspace.drumSection, drumsTrack);
      workspace.trackSection = (workspace.trackSection && workspace.trackSection.type === 'drums')? workspace.drumSection : workspace.bassSection;
      workspace.track = workspace.trackSection.track;
      $scope.ui.trackId = workspace.track.id;
    };


    function updateChordLabels() {
      var barlineElem = swiperControl.barSwiper.wrapper[0];
      Array.from(barlineElem.querySelectorAll('.chord')).forEach(function(elem) {
        elem.remove();
      });
      if (workspace.section.meta && workspace.section.meta.chords) {
        workspace.section.meta.chords.forEach(function(chordInfo) {
          var iBar = chordInfo.start[0];
          var iBeat = chordInfo.start[1];
          var iSubbeat = chordInfo.start[2] || 1;
          var beatElem = swiperControl.getBeatElem(iBar, iBeat);
          var elem = angular.element('<span class="chord">{0}{1}</span>'.format(chordInfo.root, chordInfo.type))[0];
          var subbeatPercWidth = parseInt(100/beatElem.childElementCount);
          if (iBeat === 1 && iSubbeat === 1) {
            elem.style.left = '14px';
            elem.style.width = 'calc({0}% - 28px)'.format(subbeatPercWidth);
          } else {
            elem.style.left = ((iSubbeat-1)*subbeatPercWidth)+'%';
            elem.style.width = subbeatPercWidth+'%';
          }

          angular.element(elem).on('click', function(evt) {
            fretboardViewer.setChord(workspace.section, chordInfo);
          });
          angular.element(elem).on('dblclick', function(evt) {
            playChord(chordInfo);
          });
          // beatElem.children[iSubbeat-1].appendChild(elem[0]);

          beatElem.parentNode.appendChild(elem);
        });
      }
    }

    function playChord(chord) {
      var index = workspace.section.meta.chords.indexOf(chord);
      var nextChord = workspace.section.meta.chords[index+1];
      var end = nextChord? angular.copy(nextChord.start) : [workspace.section.length+1, 1, 1];
      end[2]--;
      if (end[2] === 0) {
        end[1]--;
        end[2] = 4;
      }
      if (end[1] === 0) {
        end[0]--;
        end[1] = workspace.section.timeSignature.top;
      }

      var currentRange = audioPlayer.playbackRange;
      audioPlayer.playbackRange = {
        start: {
          bar: chord.start[0],
          beat: chord.start[1]
        },
        end: {
          bar: end[0],
          beat: end[1],
        }
      };
      function beatSync(evt) {
        timeline.beatSync(evt);
        fretboardViewer.beatSync(evt);
      }
      function chordPalybackStopped() {
        audioPlayer.playbackRange = currentRange;
        $scope.player.playing = false;
        timeline.stop();
      }
      $scope.player.playing = true;
      audioPlayer.setBpm(workspace.section.bpm);
      timeline.start();

      audioPlayer.fetchResourcesWithProgress(workspace.section)
        .then(
          audioPlayer.play.bind(
            audioPlayer,
            workspace.section,
            beatSync,
            chordPalybackStopped
          ),
          function() {$scope.player.playing = false}
        );
    }

    function sectionLoaded(section) {
      fretboardViewer.clearDiagram();
      audioVisualiser.clear();
      audioVisualiser.reinitialize();
      console.log('sectionLoaded');
      console.log(section);
      if (workspace.section) {
        for (var trackId in workspace.section.tracks) {
          var track = workspace.section.tracks[trackId];
          if (track.convertToTrackSection) {
            var convertedTrack = track.convertToTrackSection();
            convertedTrack.audio = track.audio;
            convertedTrack.instrument = track.instrument;
            workspace.section.tracks[trackId] = convertedTrack;
          }
        }
      }
      workspace.section = section;
      $scope.player.playbackRange.start = 1;
      $scope.player.playbackRange.max = section.length + 1;
      $scope.player.playbackRange.end = $scope.player.playbackRange.max;
      $scope.player.progress.value = 0;
      // $scope.player.playbackRangeChanged();

      var bassTrack;
      var drumsTrack;
      if (workspace.bassSection) {
        // choose already selected bass track
        bassTrack = projectManager.project.tracksMap[workspace.bassSection.track.id];
      }
      if (!bassTrack) {
        bassTrack = projectManager.project.tracksMap['bass_0'];
      }
      if (workspace.drumSection) {
        // choose already selected bass track
        drumsTrack = projectManager.project.tracksMap[workspace.drumSection.track.id];
      }
      if (!drumsTrack) {
        drumsTrack = projectManager.project.tracksMap['drums_0'];
      }

      $scope.initializeWorkspace(bassTrack, drumsTrack);
      if (section.tracks[bassTrack.id]) {
        var track = section.tracks[bassTrack.id];
        console.log('loading section data into editor');
        workspace.bassSection.loadBeats(track.data || track.rawData());
      }
      if (section.tracks[drumsTrack.id]) {
        var track = section.tracks[drumsTrack.id];
        workspace.drumSection.loadBeats(track.data || track.rawData());
      }
      section.tracks[bassTrack.id] = workspace.bassSection;
      section.tracks[drumsTrack.id] = workspace.drumSection;

      createSlides(workspace.trackSection);
      $mdUtil.nextTick(function() {
        swiperControl.setSlides($scope.slides, {
          slidesPerView: workspace.section.beatsPerView,
          slidesPerGroup: workspace.section.beatsPerSlide
        });
        $scope.player.playbackRangeChanged();
        $mdUtil.nextTick(function() {
          updateChordLabels();
        });
      });
    }

    projectManager.on('sectionLoaded', sectionLoaded);


    function assignTrack(trackSection, track) {
      trackSection.instrument = track.instrument;
      trackSection.track = track;
      trackSection.audio = track.audio;
    };


    $scope.ui.selectTrack = function(trackId) {
      console.log('selectTrack: '+trackId);
      var track = projectManager.project.tracksMap[trackId];
      if (workspace.track === track) {
        return;
      }
      if (workspace.track.type !== track.type) {
        if (track.type === 'drums') {
          workspace.trackSection = workspace.drumSection
        } else if (track.type === 'bass') {
          workspace.trackSection = workspace.bassSection;
        } else {
          // workspace.trackSection = new TrackSection(workspace.section.tracks[trackId]);
          workspace.trackSection = workspace.section.tracks[trackId];
          workspace.trackSection.track = track;
          console.log(workspace.trackSection)
        }
        swiperControl.switchInstrument(track.type);
      }

      if (workspace.trackSection.track.id !== track.id) {

        // Save/Convert sounds from instrument workspace into simple track data
        var convertedTrack = workspace.trackSection.convertToTrackSection();

        // id of actual instrument's track (currently loaded)
        var instrumentTrackId = workspace.trackSection.track.id;
        var instrumentTrack = projectManager.project.tracksMap[instrumentTrackId];
        convertedTrack.audio = instrumentTrack.audio;
        convertedTrack.instrument = instrumentTrack.instrument;
        workspace.section.tracks[instrumentTrackId] = convertedTrack;

        // Clear instrument workspace
        workspace.trackSection.forEachBeat(workspace.trackSection.clearBeat, workspace.trackSection);

        // Load instrument workspace with selected track data
        assignTrack(workspace.trackSection, track);
        if (workspace.section.tracks && workspace.section.tracks[track.id]) {
          workspace.trackSection.loadBeats(workspace.section.tracks[track.id].data || []);
        }
        workspace.section.tracks[track.id] = workspace.trackSection;
      }
      workspace.track = track;
    };

    if (workspace.section) {
      sectionLoaded(workspace.section);
    }

    $scope.updateSlides = function() {
      workspace.bassSection.setLength(workspace.section.length);
      workspace.drumSection.setLength(workspace.section.length);
      createSlides(workspace.trackSection);
      $scope.player.playbackRange.max = workspace.section.length + 1;
      $scope.player.playbackRange.end = $scope.player.playbackRange.max;
      updateSwiperSlides();
    };


    workspace.metadataEditor = function() {
      var position = $mdPanel.newPanelPosition()
        .absolute()
        .centerHorizontally()
        .bottom('7%')

      var animation = $mdPanel.newPanelAnimation()
        // .withAnimation($mdPanel.animation.FADE);
        .openFrom({top: window.innerHeight/2, left: window.innerWidth/2-400})
        .closeTo({top: window.innerHeight/2, left: window.innerWidth/2-400})
        .withAnimation($mdPanel.animation.SCALE)

      var dialog = $mdPanel.open({
        templateUrl: 'views/editor/section_metadata.html',
        controller: 'MetadataController',
        locals: {
          updateChordLabels: updateChordLabels
        },
        autoWrap: false,
        hasBackdrop: false,
        disableParentScroll: false,
        clickOutsideToClose: false,
        position: position,
        animation: animation,
        panelClass: 'metadata',
        onOpenComplete: function(args) {
          var containerEl = args[0].panelEl.parent();
          containerEl.css('pointerEvents', 'none');
        }
      });
    };

    swiperControl.onTouchEnd = function(sw) {
      $mdUtil.nextTick(function() {
        $scope.player.progress.value = sw.snapIndex * workspace.section.beatsPerSlide;
      });
    }

    $scope.$on('$destroy', function() {
      projectManager.un('sectionLoaded', sectionLoaded);
      // audioPlayer.un('playbackStopped', playbackStopped);
    });
    window.sw = swiperControl;

  }
})();
