(function() {
  'use strict';

  angular
    .module('bd.app')
    .factory('slidesCompiler', slidesCompiler);


  function slidesCompiler($timeout, $q, $templateRequest, $compile, projectManager) {

    var EMPTY_TRACK = {
      beat: function(bar, beat) {
        return {
          bar: bar,
          beat: beat,
          subdivision: 4
        };
      },
      beatSounds: function() {
        return [];
      }
    };

    var template;

    return {
      setTemplate: function(templateUrl) {
        if (template) return $q.when();
        return $templateRequest(templateUrl).then(function(html) {
          template = html;
        });
      },
      updateSlide: function(scope, element, slideData, viewerTrackId) {
        console.log('updating slide');
        element.firstChild.remove();

        var section = {id: -1};
        var track;
        slideData.beats.forEach(function(beat) {
          if (beat.section !== section.id) {
            section = projectManager.getSection(beat.section);// || {tracks: {}};
            track = section.tracks[viewerTrackId] || EMPTY_TRACK;
          }
          var trackBeat = track.beat(beat.bar, beat.beat)
          beat.sounds = track.beatSounds(trackBeat);
          beat.subdivision = trackBeat.subdivision;
        });
        slideData.track = viewerTrackId;

        var newScope = scope.$new(true);
        newScope.track = scope.workspace.track;
        newScope.barLabels = scope.barLabels;
        newScope.beats = slideData.beats;
        newScope.emptyBeats = slideData.emptyBeats;

        var contentEl = angular.element(template);
        $compile(contentEl)(newScope);
        element.appendChild(contentEl[0]);
        $timeout(function() {
          newScope.$destroy();
        });
      },

      generateSlide: function(scope, playlist, position, count, viewerTrackId, options) {
        var newScope = scope.$new(true);
        newScope.track = scope.workspace.track;
        newScope.barLabels = scope.barLabels;

        var slideData = {
          playlistSectionIndex: position.section,
          track: viewerTrackId
        };
        var beats = [];
        var section = playlist[position.section];
        var beatLabels = section? section.beatLabels() : [];
        var counter = count;
        while (section && counter--) {
          var track = section.tracks[viewerTrackId] || EMPTY_TRACK;
          var sectionFirstsBeat = position.bar === 1 && position.beat === 1;

          var trackBeat = track.beat(position.bar, position.beat);

          var chordLabels = [];
          if (section.meta && section.meta.chords) {
            chordLabels = section.meta.chords
              .filter(function(chord) {
                return chord.start[0] === trackBeat.bar && chord.start[1] === trackBeat.beat;
              })
              .map(function(chord) {
                return {
                  label: (chord.root || '')+(chord.type || ''),
                  subbeat: chord.start[2]
                };
              });
          }
          beats.push({
            section: section.id,
            bar: position.bar,
            beat: position.beat,
            subdivision: trackBeat.subdivision,
            timeSignature: section.timeSignature,
            chordLabels: chordLabels,
            beatLabel: beatLabels[position.beat],
            meta: trackBeat.meta,
            sounds: track.beatSounds(trackBeat),
            subbeats: [1, 2, 3, 4]
          });

          var prevSection = playlist[position.section-1];
          // forced header - TS, STRINGS, BPM, [name]?
          // var forcedHeader = beats.length === 1 &&
          //     (options.initialHeaderOn === 'all' ||
          //     (options.initialHeaderOn === 'first' && prevSection));
          var forcedHeader = beats.length === 1 && options.initialHeaderOn === 'all';

          if (forcedHeader || sectionFirstsBeat) {
            var sectionInfo = {
              timeSignature: section.timeSignature,
              bpm: section.bpm,
              name: sectionFirstsBeat? section.name : ''
            }
            if (!forcedHeader && prevSection) {
              if (prevSection.bpm === section.bpm) {
                sectionInfo.bpm = '';
              }
              if (prevSection.timeSignature.top === section.timeSignature.top &&
                prevSection.timeSignature.bottom === section.timeSignature.bottom) {
                sectionInfo.timeSignature = '';
              }
            }
            beats[beats.length-1].sectionInfo = sectionInfo;
          }

          position.beat++;
          if (position.beat > section.timeSignature.top) {
            position.beat = 1;
            position.bar++;
            if (position.bar > section.length) {
              position.bar = 1;
              position.section++;
              section = playlist[position.section];
              beatLabels = section? section.beatLabels() : [];
            }
          }
        }

        // generate empty beats to fill slide (when needed)
        var emptyBeats = new Array(count-beats.length);
        slideData.beats = beats;
        slideData.emptyBeats = emptyBeats;
        newScope.beats = beats;
        newScope.emptyBeats = emptyBeats;

        var wrapperElem = angular.element('<div class="swiper-slide"></div>');
        var element = angular.element(template);
        $compile(element)(newScope);
        wrapperElem.append(element);
        $timeout(function() {
          newScope.$destroy();
        });
        return {
          elem: wrapperElem,
          data: slideData
        }
      }
    }
  }
})();
