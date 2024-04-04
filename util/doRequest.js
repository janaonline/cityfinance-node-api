module.exports = function doRequest(url) {
    let options = {
      url : url,
      method: 'HEAD'
    }
    return new Promise(function (resolve, reject) {
      request(options, function (error, resp, body) {
        if (!error && resp?.statusCode == 404) {
          resolve(url)
  
        }else{
          reject(url);
        }
      });
    });
  }