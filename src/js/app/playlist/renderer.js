(function() {
  'use strict';

  angular
    .module('bd.app')
    .factory('slidesCompiler', slidesCompiler)
    .directive('ngAttrs', function() {
      return {
        link: function(scope, element, attrs) {
          var attrs = scope.$eval(attrs.ngAttrs);
          element.attr(attrs);
        }
      };
    })

  function slidesCompiler($timeout, $q, $templateRequest, $compile, $mdIcon, $mdUtil, projectManager, noteBendEffect) {

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
    var templateEl;
    var drumDoT;
    var bassDoT;
    var drumTemplateEl;
    var beatEl;
    var EMPTY_OBJ = {};
    return {
      setTemplate: function(templateUrl) {
        if (template) return $q.when();

        $templateRequest('views/playlist/dot/drums.html').then(function(html) {
          drumDoT = doT.template(html);
        });
        $templateRequest('views/playlist/dot/bass.html').then(function(html) {
          bassDoT = doT.template(html);
        });
        $templateRequest('views/playlist/drums.html').then(function(html) {
          drumTemplateEl = angular.element(html);
        });

        return $templateRequest(templateUrl).then(function(html) {
          template = html;
          templateEl = angular.element(template);
        });
      },
      soundAttrs: function(sound) { return EMPTY_OBJ },
      trackTemplate: function(trackId) {
        if (trackId.startsWith('drum')) {
          return drumTemplateEl.clone();
        }
        return templateEl.clone();
      },
      trackTemplateUrl: function(trackId) {
        if (trackId.startsWith('drum')) {
          return 'views/playlist/drums.html';
        }
        return 'views/playlist/slide.html';
      },
      updateSlide: function(scope, element, slideData, viewerTrackId) {

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
          beat.grid = trackBeat.grid;
        });
        slideData.track = viewerTrackId;

        /*
        var newScope = scope.$new(true);
        newScope.track = scope.workspace.track;
        newScope.barLabels = scope.barLabels;
        newScope.Note = scope.Note;
        newScope.beats = slideData.beats;
        newScope.emptyBeats = slideData.emptyBeats;
        newScope.soundAttrs = this.soundAttrs;

        // while (element.firstChild !== null) {
        //   element.firstChild.remove();
        // }
        element.lastChild.remove();
        var contentEl = this.trackTemplate(viewerTrackId);
        $compile(contentEl)(newScope);
        element.appendChild(contentEl[0]);
        $timeout(function() {
          newScope.$destroy();
        });
        */

        var context = {
          beats: slideData.beats,
          emptyBeats: slideData.emptyBeats,
          track: scope.workspace.track,
          barLabels: scope.barLabels,
          Note: scope.Note,
          bends: noteBendEffect,
          soundAttrs: this.soundAttrs
        };

        var template = viewerTrackId.startsWith('drum')? drumDoT : bassDoT;
        var html = template(context);
        element.innerHTML = html;

        if (html.indexOf('ng-scope') !== -1) {
          Array.from(element.querySelectorAll('.ng-scope')).forEach(function(el) {
            $compile(el)(scope);
          });
        }
      },

      generateSlide: function(scope, playlist, position, count, viewerTrackId, options) {
        var newScope = scope.$new(true);
        newScope.track = scope.workspace.track;
        newScope.barLabels = scope.barLabels;
        newScope.Note = scope.Note;
        newScope.soundAttrs = this.soundAttrs;

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
                var label = (chord.root || '')+(chord.type || '');
                if (chord.bass) {
                  label += ' / '+chord.bass;
                }
                return {
                  label: label,
                  subbeat: chord.start[2]
                };
              });
          }
          beats.push({
            section: section.id,
            bar: position.bar,
            beat: position.beat,
            subdivision: trackBeat.subdivision,
            grid: trackBeat.grid,
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
          // options.initialHeaderOn = 'all'
          var forcedHeader = beats.length === 1 && options.initialHeaderOn === 'all';

          if (forcedHeader || sectionFirstsBeat) {
            var sectionInfo = {
              timeSignature: section.timeSignature,
              bpm: section.bpm,
              name: sectionFirstsBeat? section.name : ''
            }
            if (!forcedHeader && prevSection) {
              if (prevSection.bpm === section.bpm &&
                  prevSection.timeSignature.bottom === section.timeSignature.bottom) {
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
        var wrapperElem = angular.element('<div class="swiper-slide"> </div>');

        if (scope.workspace.track) {
          var context = {
            beats: beats,
            emptyBeats: emptyBeats,
            track: scope.workspace.track,
            barLabels: scope.barLabels,
            Note: scope.Note,
            bends: noteBendEffect,
            soundAttrs: this.soundAttrs
          };

          var template = viewerTrackId.startsWith('drum')? drumDoT : bassDoT;
          var html = template(context);
          wrapperElem[0].innerHTML = html;

          // if (html.indexOf('<md-icon') !== -1) {
          //   var icons = wrapperElem[0].querySelectorAll('md-icon');
          //   Array.from(icons).forEach(function(iconEl) {
          //     $compile(iconEl)(scope);
          //   });
          // }
          if (html.indexOf('ng-scope') !== -1) {
            Array.from(wrapperElem[0].querySelectorAll('.ng-scope')).forEach(function(el) {
              $compile(el)(scope);
            });
          }
        }

        // $timeout(function() {
        //   wrapperElem.append(element);
        //   $mdUtil.nextTick(function() {
        //     newScope.$destroy();
        //   });
        // }, 100);

        // var wrapperElem = angular.element('<div class="swiper-slide"></div>');
        // var content = angular.element('<div ng-include="\''+this.trackTemplateUrl(viewerTrackId)+'\'" onload="loaded()"></div>');
        // newScope.loaded = function() {
        //   $mdUtil.nextTick(function() {
        //     newScope.$destroy();
        //   });
        // }
        // wrapperElem.append(content);
        // $compile(content)(newScope);

        // var contentEl = this.trackTemplate(viewerTrackId);
        // $compile(contentEl)(newScope);
        // wrapperElem.append(contentEl);
        // $timeout(function() {
        //   newScope.$destroy();
        // });
        return {
          elem: wrapperElem,
          data: slideData
        }
      }
    }
  }
})();
