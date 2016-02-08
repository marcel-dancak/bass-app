(function() {
  'use strict';

  angular
    .module('bd.app')
    .factory('audioPlayer', audioPlayer);

  function audioPlayer(context) {

    function AudioPlayer() {
      this.playing = false;
    }

    var bufferLoader = new BufferLoader(
      context,
      [
        'sounds/slap-C.mp3',
        'sounds/tap-D.mp3',
        'sounds/E.mp3',
      ],
      finishedLoading
    );

    bufferLoader.load();

    var source1, source2, source3, source4;
    var gain1, gain2, gain3, gain4;

    function finishedLoading(bufferList) {
      bufferLoader.bufferList = bufferList;
      //source1.connect(context.destination);
      //source2.connect(context.destination);

      gain1 = context.createGain();
      gain2 = context.createGain();
      gain3 = context.createGain();
      gain4 = context.createGain();

      initSources();
    }

    function initSources() {
      // Create two sources and play them both together.
      source1 = context.createBufferSource();
      source2 = context.createBufferSource();
      source3 = context.createBufferSource();
      source4 = context.createBufferSource();

      source1.buffer = bufferLoader.bufferList[0];
      source2.buffer = bufferLoader.bufferList[1];
      source3.buffer = bufferLoader.bufferList[2];
      source4.buffer = bufferLoader.bufferList[2];

      // Connect the source to the gain node.
      source1.connect(gain1);
      source2.connect(gain2);
      source3.connect(gain3);
      source4.connect(gain4);
    }

    function fadeOutCallbback(gain, step) {
      gain.value -= step;
      if (gain.value > 0) {
        setTimeout(fadeOutCallbback, 10, gain, step);
      }
    }

    function fadeOut(gain, delay, step) {
      setTimeout(fadeOutCallbback, delay*1000, gain, step);
    }

    AudioPlayer.prototype.initialize = function(destination) {
      this.destination = destination;
    };


    AudioPlayer.prototype.playback = function(arg) {
      if (this.playing) {
        requestAnimationFrame(this.playback.bind(this));
      }
    }

    AudioPlayer.prototype.play = function(noteLength) {
      this.playing = true;
      initSources();
      this.playback();
      //return;

      var noteMutingTime = 0.025+noteLength*0.1;
      var noteMutingStep = 0.01/noteMutingTime; // 10ms constant for fade-out timer

      var startTime = context.currentTime;
      gain1.gain.value = 1;
      console.log(this.destination);
      gain1.connect(this.destination);
      
      source1.start(startTime, 0, noteLength);
      fadeOut(gain1.gain, noteLength-0.02, 0.1);


      gain2.gain.value = 0.5;
      gain2.connect(this.destination);
      source2.start(startTime+noteLength-0.05, 0, noteLength+0.05);
      fadeOut(gain2.gain, 2*noteLength-noteMutingTime, noteMutingStep);

      gain3.gain.value = 0.8;
      gain3.connect(this.destination);
      source3.start(startTime+2*noteLength, 0, noteLength);
      fadeOut(gain3.gain, 3*noteLength-noteMutingTime, noteMutingStep);

      gain4.gain.value = 0.8;
      gain4.connect(this.destination);
      source4.start(startTime+3*noteLength, 0, noteLength);
      fadeOut(gain4.gain, 4*noteLength-noteMutingTime, noteMutingStep);
    };

    AudioPlayer.prototype.stop = function(noteLength) {
      this.playing = false;
    }

    return new AudioPlayer();
  }
})();