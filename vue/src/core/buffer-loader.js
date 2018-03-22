export default function BufferLoader (context, serverUrl, nativeOggDecoder) {
  this.context = context
  this.serverUrl = serverUrl
  this.format = 'ogg'
  this.nativeOggDecoder = nativeOggDecoder

  this.loadedResources = {}
  this.loadingResources = []
}

BufferLoader.prototype.onError = () => {}


BufferLoader.prototype.loadResource = function (url, callback, errorCallback) {
  if (this.loadedResources[url]) {
    if (callback) {
      callback(this.loadedResources[url])
    }
    return this.loadedResources[url]
  }
  if (this.loadingResources.indexOf(url) !== -1) {
    return
  }

  var fullUrl = this.serverUrl + url
  if (fullUrl[fullUrl.length - 4] !== '.') {
  // if (fullUrl.indexOf('.') === -1) {
    fullUrl += '.' + this.format
  }


  var loader = this

  // Load buffer asynchronously
  var request = new XMLHttpRequest()

  request.open('GET', fullUrl, true)
  request.responseType = 'arraybuffer'

  var onSuccess = function (buffer) {
    var index = loader.loadingResources.indexOf(url)
    if (index !== -1) {
      loader.loadingResources.splice(index, 1)
    }

    if (!buffer) {
      alert('error decoding file data: ' + url)
      return
    }
    loader.loadedResources[url] = buffer

    if (callback) {
      callback(buffer)
    }
  }

  request.onerror = function (response) {
    loader.onError(response)
    var index = loader.loadingResources.indexOf(url)
    if (index !== -1) {
      loader.loadingResources.splice(index, 1)
    }
    if (errorCallback) {
      errorCallback(response)
    }
  }

  request.onload = function (e) {
    if (e.target.status === 404) {
      return e.target.onerror(e.target)
    }

    if (!loader.nativeOggDecoder) {
      var t1 = performance.now()
      var ogg = oggaudiobuffer(new Uint8Array(request.response), loader.context)
      console.log('Time: ' + (performance.now() - t1))
      loader.decodeTime += performance.now() - t1
      onSuccess(ogg.data)
    } else {
      // Asynchronously decode the audio file data in request.response
      loader.context.decodeAudioData(
        request.response,
        onSuccess,
        request.onerror
      )
    }
  }

  request.send()
}

BufferLoader.prototype.loadResources = function (urlList, callback, errorCallback) {
  urlList = urlList || []
  let count = 0
  // const t1 = performance.now()
  this.decodeTime = 0

  const resourceLoaded = () => {
    count++
    if (count === urlList.length) {
      // console.log('Decode Time: '+this.decodeTime)
      // console.log('Total Time: '+(performance.now()-t1))
      callback && callback()
    }
  }

  for (let i = 0; i < urlList.length; ++i) {
    this.loadResource(urlList[i], resourceLoaded, errorCallback)
  }
}
