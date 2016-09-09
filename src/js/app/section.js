(function() {
  'use strict';

  angular
    .module('bd.app')
    .value('Section', Section);

  function Section(options) {
    angular.extend(this, options);
    this.tracks = {};
    this.tracksList = [];
    this.setLength(options.length || 1);
  }

  Section.prototype.setLength = function(length) {
    console.log('set length '+length);
    this.length = length;
    this.forEachTrack(function(track) {
      track.setLength(length);
    });
  };

  Section.prototype.addTrack = function(track, trackSection) {
    this.tracks[track.id] = trackSection;
    this.tracksList.push(track.id);
  };

  Section.prototype.forEachTrack = function(callback, type) {
    for (var i = 0; i < this.tracksList.length; i++) {
      var trackSection = this.tracks[this.tracksList[i]];
      if (!type) {
        callback(trackSection);
      } else if (type === trackSection.type) {
        callback(trackSection);
      }
    }
  };
})();
