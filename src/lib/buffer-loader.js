function BufferLoader(context, serverUrl) {
  this.context = context;
  this.serverUrl = serverUrl;
  this.format = 'ogg';

  this.loadedResources = {};
  this.loadingResources = [];
}


BufferLoader.prototype.loadResource = function(url, callback, errorCallback) {
  if (angular.isDefined(this.loadedResources[url])) {
    if (callback) {
      callback(this.loadedResources[url]);
    }
    return this.loadedResources[url];
  }
  if (this.loadingResources.indexOf(url) !== -1) {
    return;
  }

  var loader = this;

  // Load buffer asynchronously
  var request = new XMLHttpRequest();
  request.open("GET", this.serverUrl+url+'.'+this.format, true);
  request.responseType = "arraybuffer";

  request.onload = function() {
    // Asynchronously decode the audio file data in request.response
    loader.context.decodeAudioData(
      request.response,
      function(buffer) {
        var index = loader.loadingResources.indexOf(url);
        if (index !== -1) {
          loader.loadingResources.splice(index, 1);
        }

        if (!buffer) {
          alert('error decoding file data: ' + url);
          return;
        }
        loader.loadedResources[url] = buffer;

        if (callback) {
          callback(buffer);
        }
      },
      function(error) {
        console.error('decodeAudioData error', error);
        var index = loader.loadingResources.indexOf(url);
        if (index !== -1) {
          loader.loadingResources.splice(index, 1);
        }
        if (errorCallback) {
          errorCallback(error);
        }
      }
    );
  }

  request.onerror = function() {
    alert('BufferLoader: XHR error');
    var index = loader.loadingResources.indexOf(url);
    if (index !== -1) {
      loader.loadingResources.splice(index, 1);
    }
  }

  request.send();
}

BufferLoader.prototype.loadResources = function(urlList, callback, errorCallback) {
  urlList = urlList || [];
  var count = 0;
  var resourceLoaded = function() {
    count++;
    if (count === urlList.length) {
      callback && callback();
    }
  };
  for (var i = 0; i < urlList.length; ++i) {
    this.loadResource(urlList[i], resourceLoaded, errorCallback);
  }
}
