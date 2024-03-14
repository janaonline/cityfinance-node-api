const uuid = require('uuid');
const fs = require("fs");
const https = require('https');
const http = require('http');
const urlencode = require("urlencode");
const baseDir = "uploads/";
const {ENV} = require('./../../util/FormNames');
const { getStorageBaseUrl } = require('../../service/getBlobUrl');
const SECRET ={
    AWS_STORAGE_URL_STG: process.env.AWS_STORAGE_URL_STG,
    AWS_STORAGE_URL_PROD: process.env.AWS_STORAGE_URL_PROD,
    ENV: process.env.ENV
}
const generateSignedUrl = function (data) {
    return new Promise((resolve, reject) => {
        let dir = data["headers"].type ? "resource" : "objects";

        if (!fs.existsSync(baseDir)) {
            fs.mkdirSync(baseDir);
            console.log("Created Dir", baseDir);
        }
        if (!fs.existsSync(baseDir + dir)) {
            fs.mkdirSync(baseDir + dir);
            console.log("Created Dir", baseDir + dir);
        }
        // extract file_name, file_extension, file_alias

        let file_name = data.file_name;
        let file_extension = file_name.substring(file_name.lastIndexOf('.'));
        let file_alias = dir + "/" + uuid.v4() + file_extension;
        try {
            fs.closeSync(fs.openSync(baseDir + file_alias, 'w'));
            // url and file_alias has been created
            data["url"] = data.host + "/api/v1/putDataIntoFile/" + urlencode(file_alias);
            data["file_alias"] = data.host + "/" + file_alias;
            delete data["headers"]
            resolve(data)
        } catch (e) {
            reject(e);
        }
    });
}
const putData = function (filepath, req) {
    let path = baseDir + filepath;
    return new Promise(async (resolve, reject) => {
        try {
            let p = urlencode.decode(path);
            let size = getFilesizeInBytes(p);
            if (!size) {
                // if file size is empty, means data is not present in file then write to file
                let stream = createWriteStreamSync(p, { flags: 'a' });
                req.on("data", (chunk) => {
                    stream.write(chunk);
                });
                req.on("end", () => {
                    stream.end();
                    resolve("uploaded");
                })
            } else {
                resolve("Already uploaded:" + size);
            }
        } catch (e) {
            console.log("Exception", e);
            reject(e);
        }
    });
}
const createWriteStreamSync = function (file, options) {
    if (!options)
        options = {};
    if (!options.flags)
        options.flags = 'w';
    if (!options.fd)
        options.fd = fs.openSync(file, options.flags);
    return fs.createWriteStream(null, options);
}
const getFilesizeInBytes = function (filename) {
    var stats = fs.statSync(filename)
    var fileSizeInBytes = stats["size"]
    return fileSizeInBytes
}
const downloadFileToDisk = function (url, _cb) {
    try {
        let fileName = url ? (url.split("/").length ? url.split("/")[(url.split("/").length - 1)] : url.split("/")[0]) : null;
        let dest = "/tmp/" + fileName;
        var file = fs.createWriteStream(dest);
        var h = http;
        STORAGE_URL = getStorageBaseUrl();
        url = STORAGE_URL + url
        let isHttps = url.includes("https");
        if (isHttps) {
            const req = https.get(url, function (response) {
                response.pipe(file);
                file.on('finish', function () {
                    file.close(function () {
                        _cb(null, file)
                    });  // close() is async, call cb after close completes.
                });
            });
        } else {
            console.log("url", url)
            const req = http.get(url, function (response) {
                response.pipe(file);
                file.on('finish', function () {
                    file.close(function () {
                        _cb(null, file)
                    });  // close() is async, call cb after close completes.
                });
            });
        }
    } catch (e) {
        console.log("e.message", e)
        console.log(e.message)
    }
}
module.exports = {
    generateSignedUrl: generateSignedUrl,
    putData: putData,
    downloadFileToDisk: downloadFileToDisk
}
