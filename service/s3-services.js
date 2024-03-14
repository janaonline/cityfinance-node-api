const AWS = require("aws-sdk");
const path = require("path");
const fs = require("fs");
const mime = require("mime");
const os = require("os");
const tempDir = os.tmpdir();
const uuid = require("uuid");
const multer = require("multer");
const multerS3 = require("multer-s3");
const {ENV} = require('./../util/FormNames')
const CONFIG = require("../config/s3-config.json").S3BUCKET;
const sanitize = require("sanitize-filename");
const { getStorageBaseUrl } = require("./getBlobUrl");
const SECRET = {
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: process.env.AWS_REGION,
    AZURE_STORAGE_URL: process.env.AZURE_STORAGE_URL,
    AWS_STORAGE_URL_STG: process.env.AWS_STORAGE_URL_STG,
    AWS_STORAGE_URL_PROD: process.env.AWS_STORAGE_URL_PROD
};
const webExecutables = /\.(aspx|asp|css|swf|xhtml|rhtml|shtml|jsp|js|pl|php|cgi|zip|exe)$/i;
const spcialCharacters = /[`^*?":&'@{},$=!#+<>]/;
const minFileSize = process.env.MIN_FILE_SIZE ? process.env.MIN_FILE_SIZE * 1024 : 2 * 1024; // 2KB
const maxFileSize = process.env.MAX_FILE_SIZE ? process.env.MAX_FILE_SIZE * 1024 : 2048 * 1024; //2MB
const fileConfig = {
    minSize: "File size less then miminum file size",
    maxSize: "File size greater then maximum file size",
    specialChar: "File name should not contain ` ^ * ? \"  & ' @ { } , $ = ! # + < > : special characters",
    webExecutables: "aspx, asp, css, swf, xhtml, rhtml, shtml, jsp, js, pl, php, cgi, zip, exe file types not allowed",
};
if (!(SECRET.AWS_ACCESS_KEY_ID || SECRET.AWS_REGION || SECRET.AWS_SECRET_ACCESS_KEY)) {
    process.exit(
        "SECRET KEY NOT FOUND! check your .env file for AWS_ACCESS_KEY_ID,AWS_SECRET_ACCESS_KEY,AWS_REGION keys"
    );
} else if (!CONFIG.IMAGE.hasOwnProperty(process.env.ENV)) {
    console.log("cdfsdfsfd")
    process.exit(
        process.env.ENV + " Env not supported for Bucket",
        "Plz set new bucket name in routes/config/bucketConfig"
    );
} else if (!CONFIG.DATA.hasOwnProperty(process.env.ENV)) {
    process.exit(
        process.env.ENV + " Env not supported for Backup Bucket",
        "Plz set new bucket name in routes/config/bucketConfig"
    );
}
const BUCKETNAME = CONFIG["IMAGE"][process.env.ENV] ? CONFIG["IMAGE"][process.env.ENV] : "staging-dhwani";
const BACKUPBUCKETNAME = CONFIG["DATA"][process.env.ENV];
//  AWS Configuration
AWS.config.update({
    accessKeyId: SECRET.AWS_ACCESS_KEY_ID,
    secretAccessKey: SECRET.AWS_SECRET_ACCESS_KEY,
});
AWS.config.region = SECRET.AWS_REGION;
var s3 = new AWS.S3();

function initBucket() {
    var params = {
        Bucket: BUCKETNAME,
        ACL: "public-read",
        CreateBucketConfiguration: {
            LocationConstraint: SECRET.AWS_REGION,
        },
    };

    s3.createBucket(params, function (err, data) {
        if (err && err.statusCode === 409) {
            console.log("BUCKET ALREADY OWNED");
        } else if (err) {
            console.log("BUCKET CREATE ERROR", err);
            process.exit("BUCKET CREATE ERROR : " + JSON.stringify(err));
        } else console.log("BUCKET CREATED", data);

        var params = {
            Bucket: BUCKETNAME,
            CORSConfiguration: {
                CORSRules: [
                    {
                        AllowedMethods: ["HEAD", "GET", "PUT", "POST"],
                        AllowedOrigins: ["*"],
                        AllowedHeaders: ["*"],
                        ExposeHeaders: [],
                        MaxAgeSeconds: 36000,
                    },
                ],
            },
        };

        s3.putBucketCors(params, function (err) {
            if (err) console.log("BUCKET CORS SET ERR", err);
            console.log("BUCKET CORS SET");
        });
    });
}
function initBackupBucket() {
    var params = {
        Bucket: BACKUPBUCKETNAME,
        ACL: "public-read",
        CreateBucketConfiguration: {
            LocationConstraint: SECRET.AWS_REGION,
        },
    };

    s3.createBucket(params, function (err, data) {
        if (err && err.statusCode === 409) {
            console.log("BUCKET ALREADY OWNED");
        } else if (err) {
            console.log("BUCKET CREATE ERROR", err);
            process.exit("BUCKET CREATE ERROR : " + JSON.stringify(err));
        } else console.log("BUCKET CREATED", data);

        var params = {
            Bucket: BACKUPBUCKETNAME,
            CORSConfiguration: {
                CORSRules: [
                    {
                        AllowedMethods: ["HEAD", "GET", "PUT", "POST"],
                        AllowedOrigins: ["*"],
                        AllowedHeaders: ["*"],
                        ExposeHeaders: [],
                        MaxAgeSeconds: 36000,
                    },
                ],
            },
        };

        s3.putBucketCors(params, function (err) {
            if (err) console.log("BUCKET CORS SET ERR", err);
            console.log("BUCKET CORS SET");
        });
    });
}
async function generateSignedUrl(data, _cb) {
    return new Promise((resolve, reject) => {
        var file_name = data.file_name;
        let { custom,strictName } = data;
        strictName = strictName === "true"
        let fileNameWithoutExt = file_name.substring(0, file_name.lastIndexOf("."));
        var file_extension = file_name.substring(file_name.lastIndexOf("."));

        let date = new Date(Date.now()).toLocaleString().split("/").join("-");
        if (spcialCharacters.test(fileNameWithoutExt)) {
            reject({ message: fileConfig.specialChar });
        } else if (webExecutables.test(file_name)) {
            reject({ message: fileConfig.webExecutables });
        }

        date = date.split(":").join("-");
        date = date.split(", ").join("_");

        var file_alias = custom || custom === ""
            ? fileNameWithoutExt + "_" + date + file_extension
            : fileNameWithoutExt + "_" + uuid.v4() + file_extension;
        file_alias = strictName ? fileNameWithoutExt + file_extension : file_alias
        var params = {
            Bucket: BUCKETNAME,
            Key: data?.folder ? data?.folder + '/' + file_alias : file_alias,
            Expires: 60 * 60 * 60,
            ContentType: data.mime_type,
            ACL: "public-read",
            Metadata: {
                name: file_name,
                alias: file_alias,
                type: data.mime_type,
            },
        };

        s3.getSignedUrl("putObject", params, function (err, _url) {
            if (!err) {
                let getUrl = _url.substring(0, _url.indexOf("?"))
                resolve({
                    url: _url,
                    file_alias: file_alias,
                    file_url: getUrl,
                    path: removePrefix(getUrl)
                });
            } else {
                reject(err);
            }
        });
    });
}
function downloadFileToDisk(fileName, _cb) {
    var params = { Bucket: BUCKETNAME, Key: fileName };
    var file = fs.createWriteStream(path.join(tempDir, fileName));
    var x = s3.getObject(params).createReadStream();
    x.pipe(file);
    x.on("end", function () {
        console.log("download done- ", file.path);
        return _cb(null, file.path);
    });
    x.on("error", function (err) {
        console.log("download ERROR- ", file.path, arguments);
        return _cb(err, null);
    });
}
function uploadFileFromDisk(filePath, _cb, dir = "") {
    let isNotAllowed = fileValidation(filePath);
    if (isNotAllowed) {
        _cb({ message: isNotAllowed }, null);
        return;
    }
    dir = dir ? dir + "/" : dir;
    var file_extension = filePath.substring(filePath.lastIndexOf("."));
    var file_alias = uuid.v4() + file_extension;
    var mime_type = mime.lookup(filePath);

    var fileStream = fs.createReadStream(path.join(__dirname, "../../", filePath));
    fileStream.on("error", function (err) {
        if (err) {
            _cb(err, null);
        }
    });
    fileStream.on("open", function () {
        var s3 = new AWS.S3();
        s3.putObject(
            {
                Body: fileStream,
                Bucket: BACKUPBUCKETNAME,
                Key: dir + file_alias,
                ContentType: mime_type,
                ACL: "public-read",
                CacheControl: "max-age=2",
                Metadata: {
                    alias: file_alias,
                    type: mime_type,
                },
            },
            function (err) {
                if (err) {
                    _cb(err, null);
                }
                var uri = "https://" + BACKUPBUCKETNAME + "." + s3.endpoint.host + "/" + file_alias;
                console.log("done upload", uri);
                _cb(null, uri);
            }
        );
    });
}
function uploadPptFileFromDisk(filePath, fileNameToBe, _cb, dir = "") {
    let isNotAllowed = fileValidation(filePath);
    if (isNotAllowed) {
        _cb({ message: isNotAllowed }, null);
        return;
    }
    dir = dir ? dir + "/" : dir;
    var file_alias = fileNameToBe;
    var mime_type = mime.getType(fileNameToBe);
    var fileStream = fs.createReadStream(filePath);
    fileStream.on("error", function (err) {
        if (err) {
            _cb(err, null);
        }
    });
    fileStream.on("open", function () {
        var s3 = new AWS.S3();
        s3.putObject(
            {
                Body: fileStream,
                Bucket: BACKUPBUCKETNAME,
                Key: dir + file_alias,
                ContentType: mime_type,
                ACL: "public-read",
                CacheControl: "max-age=2",
                Metadata: {
                    alias: file_alias,
                    type: mime_type,
                },
            },
            function (err) {
                if (err) {
                    _cb(err, null);
                }
                console.log(s3.endpoint.host, file_alias);
                var uri = "https://" + BACKUPBUCKETNAME + "." + s3.endpoint.host + "/" + file_alias;
                console.log("done upload", uri);
                _cb(null, uri);
            }
        );
    });
}
function createFileAndUploadData(file_name, data, _cb) {
    var mime_type = mime.getType(file_name);
    console.log("file_name", mime_type, file_name);
    var s3 = new AWS.S3();
    s3.putObject(
        {
            Body: data,
            Bucket: BUCKETNAME,
            Key: file_name,
            ContentType: mime_type,
            ACL: "public-read",
            CacheControl: "max-age=2",
            Metadata: {
                alias: file_name,
                type: mime_type,
            },
        },
        function (err) {
            if (err) {
                console.log(err);
                _cb(err, null);
            } else {
                var uri = "https://" + BUCKETNAME + "." + s3.endpoint.host + "/" + file_name;
                console.log("done upload", uri);
                _cb(null, uri);
            }
        }
    );
}
function uploadFileFromDiskDBBackup(filename, _cb) {
    var file_extension = filename.substring(filename.lastIndexOf("."));
    var file_alias = filename.split("/").pop();
    var mime_type = mime.lookup(filename);
    var filePath = path.join(__dirname, "../../", filename);
    let isNotAllowed = fileValidation(filePath);
    if (isNotAllowed) {
        _cb({ message: isNotAllowed }, null);
        return;
    }
    var fileStream = fs.createReadStream(filePath);
    fileStream.on("error", function (err) {
        if (err) {
            _cb(err, null);
        }
    });
    fileStream.on("open", function () {
        var s3 = new AWS.S3();
        s3.putObject(
            {
                Body: fileStream,
                Bucket: BACKUPBUCKETNAME,
                Key: file_alias,
                ContentType: mime_type,
                ACL: "public-read",
                CacheControl: "max-age=2",
                Metadata: {
                    alias: file_alias,
                    type: mime_type,
                },
            },
            function (err) {
                if (err) {
                    _cb(err, null);
                }
                var uri = "https://" + BACKUPBUCKETNAME + "." + s3.endpoint.host + "/" + file_alias;
                console.log("done upload", uri);
                _cb(null, uri);
            }
        );
    });
}
function uploadFileFromDiskDeployment(filename, _cb) {
    var file_extension = filename.substring(filename.lastIndexOf("."));
    var file_alias = uuid.v4() + file_extension;
    var mime_type = mime.lookup(filename);
    var filePath = path.join(__dirname, "../../", filename);
    let isNotAllowed = fileValidation(filePath);
    if (isNotAllowed) {
        _cb({ message: isNotAllowed }, null);
        return;
    }
    var fileStream = fs.createReadStream(filePath);
    fileStream.on("error", function (err) {
        if (err) {
            _cb(err, null);
        }
    });
    fileStream.on("open", function () {
        var s3 = new AWS.S3();
        s3.putObject(
            {
                Body: fileStream,
                Bucket: DEPLOYMENTBUCKETNAME,
                Key: file_alias,
                ContentType: mime_type,
                ACL: "public-read",
                CacheControl: "max-age=2",
                Metadata: {
                    alias: file_alias,
                    type: mime_type,
                },
            },
            function (err) {
                if (err) {
                    _cb(err, null);
                }
                var uri = "https://" + DEPLOYMENTBUCKETNAME + "." + s3.endpoint.host + "/" + file_alias;
                console.log("done upload", uri);
                _cb(null, uri);
            }
        );
    });
}
var uploadMulter = multer({
    storage: multerS3({
        s3: s3,
        bucket: "some-bucket",
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            cb(null, Date.now().toString());
        },
    }),
});

function fileValidation(filePath) {
    try {
        const stats = fs.statSync(filePath);
        const filename = path.basename(filePath);
        const sanitizeFilename = sanitize(filename);
        if (stats.size < minFileSize) return fileConfig.minSize;
        else if (stats.size > maxFileSize) return fileConfig.maxSize; //size validation
        if (filename.length != sanitizeFilename.length) return fileConfig.specialChar; //sanitize check
        if (webExecutables.test(sanitizeFilename)) return fileConfig.webExecutables; //web executables check
        if (spcialCharacters.test(sanitizeFilename)) return fileConfig.specialChar; //special characters check
    } catch (error) {
        return error.message;
    }
}
function getObjectStream(params) {
    return s3.getObject(params).createReadStream();
}

async function getheadObject(params) {
    return new Promise((resolve, reject) => {
    s3.headObject(params, function(err, data) {
        if (err) {
            if (err.code === 'NotFound') {
                reject(new Error(`Object not found: ${params.Key}`));
            } else {
                reject(err);
            }
            } else {
                const creationDate = data.LastModified;
                resolve(creationDate);
            }
        });
    });
}
/**
 * The function removes a specific prefix from a given URL if it starts with that prefix.
 * @param url - The `url` parameter is a string that represents a URL.
 * @returns The function will return the URL with the prefix removed if the URL starts with the
 * specified prefix. If the URL does not start with the prefix, it will return the original URL.
 */
function removePrefix(url) {
    try {
      const prefixToRemove = getStorageBaseUrl();
      if (url.startsWith(prefixToRemove)) {
        return url.substring(prefixToRemove.length);
      }
      return url;
    } catch (error) {
      throw {message: `removePrefix: ${error.message}`}
    }
  }
module.exports.getheadObject = getheadObject;
module.exports.getObjectStream = getObjectStream;
module.exports.initBucket = initBucket;
module.exports.initBackupBucket = initBackupBucket;

module.exports.generateSignedUrl = generateSignedUrl;

module.exports.downloadFileToDisk = downloadFileToDisk;

module.exports.createFileAndUploadData = createFileAndUploadData;
module.exports.uploadFileFromDisk = uploadFileFromDisk;
module.exports.uploadPptFileFromDisk = uploadPptFileFromDisk;
module.exports.uploadMulter = uploadMulter;

module.exports.s3 = s3;
module.exports.uploadFileFromDiskDBBackup = uploadFileFromDiskDBBackup;
module.exports.uploadFileFromDiskDeployment = uploadFileFromDiskDeployment;
