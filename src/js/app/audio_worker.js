var bufferLength = 2048;

onnodecreate = function(e) {
  var node = e.node;
  console.log(e);

  node.buffers = [ new Float32Array(bufferLength), new Float32Array(bufferLength) ];
  node.bufferIndex = 0;
  node.onmessage = function(e) {
    node.buffers = e.data;
    node.bufferIndex = 0;
  };
};

var lastTime;
var count = 0;
onaudioprocess = function(e) {
  var node = e.node;

  var currentTime = e.playbackTime;
  lastTime = e.playbackTime;

  if (count++ < 2 && e.inputs.length) {
    console.log(document);
    var context = self.__target__._context;
    
    var oscillator = context.createOscillator();
    var oscGain = context.createGain();
    // oscGain.gain.value = 0.0001;
    oscGain.gain.value = 0.2;
    oscillator.connect(oscGain);
    oscGain.connect(context.destination);
    oscillator.frequency.value = 200;
    // oscillator.start();
  }
  for (var channel = 0; channel < e.inputs[0].length; channel++) {
    var inputBuffer = e.inputs[0][channel];
    e.outputs[0][channel].set(inputBuffer);

    if (node.buffers) {
      node.buffers[channel].set(inputBuffer, node.bufferIndex);
    }
  }

  // if (node.buffers !== null) {
  //   node.bufferIndex += e.inputs[0][0].length;
  //   if (bufferLength <= node.bufferIndex) {
  //     node.postMessage(node.buffers, [ node.buffers[0].buffer, node.buffers[1].buffer ]);
  //     node.buffers = null;
  //   }
  // }
};