(function() {
  'use strict';

  angular
    .module('bd.app')
    .value('Drums', createDrums());


  function createDrums() {
    var drumsKits = {
      Drums: [
        {
          name: 'tom1',
          label: 'Small Rack Tom',
          filename: 'sounds/drums/acoustic/small-rack-tom'
        }, {
          name: 'tom2',
          label: 'Big Rack Tom',
          filename: 'sounds/drums/acoustic/big-rack-tom'
        }, {
          name: 'tom3',
          label: 'Floor Tom',
          filename: 'sounds/drums/acoustic/floor-tom'
        }, {
          name: 'crash',
          label: 'Crash',
          filename: 'sounds/drums/acoustic/crash'
        }, {
          name: 'hihat-open',
          label: 'Hi-Hat Open',
          filename: 'sounds/drums/acoustic/hi-hat-open'
        }, {
          name: 'hihat',
          label: 'Hi-Hat Closed',
          filename: 'sounds/drums/acoustic/hi-hat-closed'
        }, {
          name: 'snare',
          label: 'Snare',
          filename: 'sounds/drums/acoustic/snare'
        }, {
          name: 'kick',
          label: 'Kick',
          filename: 'sounds/drums/acoustic/kick'
        }
      ],
      Percussions: [
        {
          name: 'clap',
          label: 'Clap',
          filename: 'sounds/percussion/clap_009'
        }, {
          name: 'tambourine',
          label: 'Tambourine',
          filename: 'sounds/percussion/tambourine_001'
        }, {
          name: 'maracas',
          label: 'Maracas',
          filename: 'sounds/percussion/shaker_009'
        }, {
          name: 'cabasa',
          label: 'Cabasa',
          filename: 'sounds/percussion/shaker_002'
        }, {
          name: 'bongo',
          label: 'Bongo',
          filename: 'sounds/percussion/bongo_001d'
        }, {
          name: 'djembe',
          label: 'Djembe',
          filename: 'sounds/percussion/bongo_005d'
        }, {
          name: 'conga',
          label: 'Conga',
          filename: 'sounds/percussion/bongo_006r'
        }, {
          name: 'cajon',
          label: 'Cajon',
          filename: 'sounds/percussion/bongo_002c'
        }
      ]
    };

    for (name in drumsKits) {
      var kit = drumsKits[name];
      kit.drumMap = {};
      kit.forEach(function(drum) {
        kit.drumMap[drum.name] = drum;
      });
    }
    return drumsKits;
  }

})();