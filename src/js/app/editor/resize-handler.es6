(function() {
  'use strict';

  angular
    .module('bd.app')
    .factory('ResizeHandler', resizeHandler)


  function resizeHandler(workspace, Note, soundAnimation) {

    var resizeBox = {
      elem: angular.element('<div class="resize-box"><i></i></div>')[0],
      setSymbol: function(symbol, dotted) {
        var labelElem = this.elem.children[0];
        labelElem.className = symbol;
        labelElem.innerHTML = dotted? '.' : '';
      },
      setPxStyles: function(styles) {
        for (var key in styles) {
          this.elem.style[key] = styles[key]+'px';
        }
      }
    };

    var noteLengthSymbols = {};
    for (name in Note) {
      var note = Note[name];
      noteLengthSymbols[note.value] = note.symbol;
    }

    var noteLengths = [
      {
        length: 1,
        dotted: false
      }, {
        length: 1,
        dotted: true
      }, {
        length: 2,
        dotted: false
      }, {
        length: 2,
        dotted: true
      }, {
        length: 4,
        dotted: false
      }, {
        length: 4,
        dotted: true
      }, {
        length: 8,
        dotted: false
      }, {
        length: 8,
        dotted: true
      }, {
        length: 16,
        dotted: false
      }, {
        length: 16,
        dotted: true
      }/*, {
        length: 32,
        dotted: false
      }*/
    ];

    var notesWidths;
    var resizeLength;

    class ResizeHandler {
      constructor() {
        this.resizeBox = resizeBox;
      }

      resizeSound(sound, length, dotted) {
        var dependencies = [];

        // collect next sounds
        var s = sound;
        while (s.next) {
          s = workspace.trackSection.nextSound(s);
          if (!s) break;
          dependencies.push(s);
        }
        sound.note.length = length;
        sound.note.dotted = dotted;

        var duration = workspace.trackSection.soundDuration(sound);
        sound.end = sound.start + duration;

        var prevSound = sound;
        dependencies.forEach(function(depSound) {
          var position = workspace.trackSection.nextSoundPosition(prevSound);
          depSound.start = position.start;
          if (position.beat !== depSound.beat) {
            // console.log('moving to '+position.beat.beat+ ' at: '+position.start);
            depSound.beat.data.splice(depSound.beat.data.indexOf(depSound), 1);
            workspace.trackSection.addSound(position.beat, depSound);
          } else {
            // console.log('moving to position '+position.start)
            depSound.end = depSound.start + workspace.trackSection.soundDuration(depSound);
          }
          prevSound = depSound;
        });
      }

      beforeResize(sound, info) {}
      afterResize(sound, info) {}

      onResizeStart(sound, info) {
        var soundElem = info.element[0].parentElement;
        this.beforeResize(sound, info);
        soundElem.appendChild(this.resizeBox.elem);

        var beatWidth = soundElem.parentElement.clientWidth;
        var tmpSound = {beat: sound.beat};
        notesWidths = noteLengths.map(function(noteLength) {
          tmpSound.note = noteLength;
          return workspace.trackSection.soundDuration(tmpSound) * beatWidth;
        });

        this.onResize(sound, info);
      }

      onResize(sound, info) {
        var delta, closestWidth;
        var minDelta = notesWidths[0];
        notesWidths.forEach(function(width, index) {
          delta = Math.abs(info.width - width);
          if (delta < minDelta) {
            closestWidth = width;
            minDelta = delta;
            resizeLength = noteLengths[index];
          }
        });
        resizeBox.setPxStyles({width: closestWidth});
        var symbol = noteLengthSymbols[resizeLength.length];
        resizeBox.setSymbol(symbol, resizeLength.dotted);
      }

      onResizeEnd(sound, info, evt) {
        info.element.css('width', '');
        soundAnimation(info.element[0], 'resize');
        resizeBox.elem.remove();

        this.resizeSound(sound, resizeLength.length, resizeLength.dotted);
        evt.stopPropagation();
        this.afterResize(sound, info);
      }
    }
    return ResizeHandler;
  }

})();