(function() {
  'use strict';


  function prevActiveNode (chain, node) {
    let index = chain.indexOf(node);
    while (--index >= 0) {
      if (chain[index].active) {
        return chain[index];
      }
    }
  }

  function nextActiveNode (chain, node) {
    let index = chain.indexOf(node);
    while (++index < chain.length) {
      if (chain[index].active) {
        return chain[index];
      }
    }
  }

  function AudioTrack (context, config) {
    const audio = context.createGain();
    const audioConfig = {};

    Object.defineProperty(audio, 'volume', {
      set (value) {
        audioConfig.volume = value;
        if (audio.active && !audio.muted) {
          audio.gain.value = value;
        }
      },
      get () {
        return audioConfig.volume;
      }
    });

    Object.defineProperty(audio, 'muted', {
      set (mute) {
        if (mute) {
          audio.gain.value = 0;
        } else if (audio.active) {
          audio.gain.value = audioConfig.volume;
        }
        audioConfig.muted = mute;
      },
      get () {
        return audioConfig.muted;
      }
    });
    Object.defineProperty(audio, 'active', {
      set (active) {
        if (active && !audio.muted) {
          audio.gain.value = audio.volume;
        } else {
          audio.gain.value = 0;
        }
        this._active = active;
      },
      get () {
        return this._active;
      }
    });
    audio.volume = 1;
    audio.muted = false;
    audio.active = true;

    Object.assign(audio, {

      add (node) {
        audio.chain.push(node);
        Object.defineProperty(node, 'active', {
          set (active) {
            if (active) {
              const prevNode = prevActiveNode(audio.chain, node) || audio;
              const nextNode = nextActiveNode(audio.chain, node) || context.destination;
              prevNode.disconnect();
              prevNode.connect(node);
              node.connect(nextNode);
            } else {
              const prevNode = prevActiveNode(audio.chain, node) || audio;
              const nextNode = nextActiveNode(audio.chain, node) || context.destination;
              node.disconnect();
              prevNode.disconnect();
              prevNode.connect(nextNode);
            }
            this._active = active;
          },
          get () {
            return this._active;
          }
        });
        node.active = true;
      },

      addCompressor (params) {
        const compressor = context.createDynamicsCompressor();
        for (let param in params) {
          compressor[param].value = params[param];
        }
        this.add(compressor);
        audio.compressor = compressor;

        const oscillator = context.createOscillator();
        oscillator.frequency.value = 22050;
        oscillator.connect(compressor);
        oscillator.start();
        setTimeout(() => {oscillator.stop()}, 50);
        return compressor;
      },
      toJSON () {
        return audioConfig;
      }
    });
    audio.chain = [];
    audio.connect(context.destination);

    return audio;
  }


  function StreamAudioTrack(stream) {
    const audio = {};
    const audioConfig = {};
    Object.defineProperty(audio, 'volume', {
      set (value) {
        audioConfig.volume = value;
        if (audio.active && !audio.muted) {
          stream.volume = value;
        }
      },
      get () {
        return audioConfig.volume;
      }
    });
    Object.defineProperty(audio, 'muted', {
      set (mute) {
        if (mute) {
          stream.volume = 0;
        } else if (audio.active) {
          stream.volume = audio.volume;
        }
        audioConfig.muted = mute;
      },
      get () {
        return audioConfig.muted;
      }
    });
    Object.defineProperty(audio, 'active', {
      set (active) {
        if (active && !audio.muted) {
          stream.volume = audio.volume;
        } else {
          stream.volume = 0;
        }
        audioConfig.active = active;
      },
      get () {
        return audioConfig.active;
      }
    });
    audio.volume = 1;
    audio.muted = false;
    audio.active = true;
    return audio;
  }

  window.AudioTrack = AudioTrack;

  angular
    .module('bd.app')
    .value('AudioTrack', AudioTrack)
    .value('StreamAudioTrack', StreamAudioTrack)

})();