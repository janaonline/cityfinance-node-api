const AWS = require('aws-sdk');
const path = require('path');
const fs = require('fs');
const mime = require('mime');
const os = require('os');
const tempDir = os.tmpdir();
const uuid = require('uuid');
const multer = require('multer')
const multerS3 = require('multer-s3');
const CONFIG = {
    "DATA" : {
        "production":process.env.S3BUCKET_DATA_PROD,
        "staging" : process.env.S3BUCKET_DATA_STG,
        "demo" : process.env.S3BUCKET_DATA_DEMO,
        "development" : process.env.S3BUCKET_DATA_DEV
    },
    "IMAGE" : {
        "production":process.env.S3BUCKET_IMAGE_PROD,
        "staging" : process.env.S3BUCKET_IMAGE_STG,
        "demo" : process.env.S3BUCKET_IMAGE_DEMO,
        "development" : process.env.S3BUCKET_IMAGE_DEV
    }
};
const SECRET = {
    AWS_ACCESS_KEY_ID : process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY : process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION : process.env.AWS_REGION
};
if(!(SECRET.AWS_ACCESS_KEY_ID || SECRET.AWS_REGION || SECRET.AWS_SECRET_ACCESS_KEY)){
    process.exit("SECRET KEY NOT FOUND! check your .env file for AWS_ACCESS_KEY_ID,AWS_SECRET_ACCESS_KEY,AWS_REGION keys");
}else if( !CONFIG.IMAGE.hasOwnProperty(process.env.ENV)){
    process.exit(process.env.ENV+" Env not supported for Bucket","Plz set new bucket name in routes/config/bucketConfig");
}else if(!CONFIG.DATA.hasOwnProperty(process.env.ENV)){
    process.exit(process.env.ENV+" Env not supported for Backup Bucket","Plz set new bucket name in routes/config/bucketConfig");
}
const BUCKETNAME = CONFIG["IMAGE"][process.env.ENV];
const BACKUPBUCKETNAME = CONFIG["DATA"][process.env.ENV];
//  AWS Configuration
AWS.config.update({
    accessKeyId: SECRET.AWS_ACCESS_KEY_ID,
    secretAccessKey: SECRET.AWS_SECRET_ACCESS_KEY
});
AWS.config.region = SECRET.AWS_REGION;
var s3 = new AWS.S3();

function initBucket() {
    var params = {
        Bucket: BUCKETNAME,
        ACL: 'public-read',
        CreateBucketConfiguration: {
            LocationConstraint: SECRET.AWS_REGION
        }
    };

    s3.createBucket(params, function (err, data) {
        if (err && err.statusCode === 409) {
            console.log('BUCKET ALREADY OWNED');
        }
        else if (err) {
            console.log('BUCKET CREATE ERROR', err);
            process.exit('BUCKET CREATE ERROR : '+JSON.stringify(err));
        }
        else console.log('BUCKET CREATED', data);

        var params = {
            Bucket: BUCKETNAME,
            CORSConfiguration: {
                CORSRules: [{
                    AllowedMethods: ["HEAD", "GET", "PUT", "POST"],
                    AllowedOrigins: ["*"],
                    AllowedHeaders: ["*"],
                    ExposeHeaders: [],
                    MaxAgeSeconds: 36000
                }]
            }
        };

        s3.putBucketCors(params, function (err) {
            if (err) console.log('BUCKET CORS SET ERR', err);
            console.log('BUCKET CORS SET');
        });
    });
}
function initBackupBucket() {
    var params = {
        Bucket: BACKUPBUCKETNAME,
        ACL: 'public-read',
        CreateBucketConfiguration: {
            LocationConstraint: SECRET.AWS_REGION
        }
    };

    s3.createBucket(params, function (err, data) {
        if (err && err.statusCode === 409) {
            console.log('BUCKET ALREADY OWNED');
        }
        else if (err) {
            console.log('BUCKET CREATE ERROR', err);
            process.exit('BUCKET CREATE ERROR : '+ JSON.stringify(err));
        }
        else console.log('BUCKET CREATED', data);

        var params = {
            Bucket: BACKUPBUCKETNAME,
            CORSConfiguration: {
                CORSRules: [{
                    AllowedMethods: ["HEAD", "GET", "PUT", "POST"],
                    AllowedOrigins: ["*"],
                    AllowedHeaders: ["*"],
                    ExposeHeaders: [],
                    MaxAgeSeconds: 36000
                }]
            }
        };

        s3.putBucketCors(params, function (err) {
            if (err) console.log('BUCKET CORS SET ERR', err);
            console.log('BUCKET CORS SET');
        });
    });
}
function generateSignedUrl(data, _cb) {
    var file_name = data.file_name;
    var file_extension = file_name.substring(file_name.lastIndexOf('.'));
    var file_alias = "CityFinance/"+uuid.v4() + file_extension;
    var params = {
        Bucket: BUCKETNAME,
        Key: file_alias,
        Expires: 60 * 60 * 60,
        ContentType: data.mime_type,
        ACL: 'public-read',
        Metadata: {
            name: file_name,
            alias: file_alias,
            type: data.mime_type
        }
    };

    s3.getSignedUrl('putObject', params, function (err, _url) {
        if (!err) {
            return _cb(null, {
                url: _url,
                file_alias: file_alias,
                file_url: _url.substring(0, _url.indexOf('?'))
            });
        } else {
            return _cb(err, null);
        }
    });
}
function downloadFileToDisk(fName, _cb) {
    let fileName = fName ? fName.split("/")[0]:null;
    var params = {Bucket: BUCKETNAME, Key: fName};
    var file = fs.createWriteStream(path.join(tempDir, fileName));
    var x = s3.getObject(params).createReadStream();
    x.pipe(file);
    x.on('end', function () {
        console.log('download done- ', file.path);
        return _cb(null, file.path);
    });
    x.on('error', function (err) {
        console.log('download ERROR- ', file.path, arguments);
        return _cb(err, null);
    });
}

function uploadFileFromDisk(filePath, _cb, dir="") {
    dir = dir ? (dir+"/") : dir;
    var file_extension = filePath.substring(filePath.lastIndexOf('.'));
    var file_alias = uuid.v4() + file_extension;
    var mime_type = mime.lookup(filePath);

    var fileStream = fs.createReadStream(path.join(__dirname,"../../",filePath));
    fileStream.on('error', function (err) {
        if (err) {
            _cb(err, null);
        }
    });
    fileStream.on('open', function () {
        var s3 = new AWS.S3();
        s3.putObject({
            Body: fileStream,
            Bucket: BACKUPBUCKETNAME,
            Key: dir+file_alias,
            ContentType: mime_type,
            ACL: 'public-read',
            CacheControl: 'max-age=2',
            Metadata: {
                alias: file_alias,
                type: mime_type
            }
        }, function (err) {
            if (err) {
                _cb(err, null);
            }
            var uri = 'https://' + BACKUPBUCKETNAME + '.' + s3.endpoint.host + '/' + file_alias;
            console.log('done upload', uri);
            _cb(null, uri);
        });
    });
}
function createFileAndUploadData(file_name, data, _cb) {
    var mime_type = mime.getType(file_name);
    console.log("file_name",mime_type,file_name);
    var s3 = new AWS.S3();
    s3.putObject({
        Body: data,
        Bucket: BUCKETNAME,
        Key: file_name,
        ContentType: mime_type,
        ACL: 'public-read',
        CacheControl: 'max-age=2',
        Metadata: {
            alias: file_name,
            type: mime_type
        }
    }, function (err) {
        if (err) {
            _cb(err, null);
        }else{
            var uri = 'https://' + BUCKETNAME + '.' + s3.endpoint.host + '/' + file_name;
            console.log('done upload', uri);
            _cb(null, uri);
        }
    });
}
function uploadFileFromDiskDBBackup(filename, _cb) {

    var file_extension = filename.substring(filename.lastIndexOf('.'));
    var file_alias = filename.split("/").pop();
    var mime_type = mime.lookup(filename);
    var filePath = path.join(__dirname,"../../",filename);
    var fileStream = fs.createReadStream(filePath);
    fileStream.on('error', function (err) {
        if (err) {
            _cb(err, null);
        }
    });
    fileStream.on('open', function () {
        var s3 = new AWS.S3();
        s3.putObject({
            Body: fileStream,
            Bucket: BACKUPBUCKETNAME,
            Key: file_alias,
            ContentType: mime_type,
            ACL: 'public-read',
            CacheControl: 'max-age=2',
            Metadata: {
                alias: file_alias,
                type: mime_type
            }
        }, function (err) {
            if (err) {
                _cb(err, null);
            }
            var uri = 'https://' + BACKUPBUCKETNAME + '.' + s3.endpoint.host + '/' + file_alias;
            console.log('done upload', uri);
            _cb(null, uri);
        });
    });
}
function uploadFileFromDiskDeployment(filename, _cb) {

    var file_extension = filename.substring(filename.lastIndexOf('.'));
    var file_alias = uuid.v4()+file_extension;
    var mime_type = mime.lookup(filename);
    var filePath = path.join(__dirname,"../../",filename);
    var fileStream = fs.createReadStream(filePath);
    fileStream.on('error', function (err) {
        if (err) {
            _cb(err, null);
        }
    });
    fileStream.on('open', function () {
        var s3 = new AWS.S3();
        s3.putObject({
            Body: fileStream,
            Bucket: DEPLOYMENTBUCKETNAME,
            Key: file_alias,
            ContentType: mime_type,
            ACL: 'public-read',
            CacheControl: 'max-age=2',
            Metadata: {
                alias: file_alias,
                type: mime_type
            }
        }, function (err) {
            if (err) {
                _cb(err, null);
            }
            var uri = 'https://' + DEPLOYMENTBUCKETNAME + '.' + s3.endpoint.host + '/' + file_alias;
            console.log('done upload', uri);
            _cb(null, uri);
        });
    });
}
var uploadMulter = multer({
    storage: multerS3({
        s3: s3,
        bucket: 'some-bucket',
        metadata: function (req, file, cb) {
            cb(null, {fieldName: file.fieldname});
        },
        key: function (req, file, cb) {
            cb(null, Date.now().toString())
        }
    })
})

module.exports.initBucket = initBucket;
module.exports.initBackupBucket = initBackupBucket;

module.exports.generateSignedUrl = generateSignedUrl;

module.exports.downloadFileToDisk = downloadFileToDisk;

module.exports.createFileAndUploadData = createFileAndUploadData;
module.exports.uploadFileFromDisk = uploadFileFromDisk;
module.exports.uploadMulter = uploadMulter;

module.exports.uploadFileFromDiskDBBackup = uploadFileFromDiskDBBackup;
module.exports.uploadFileFromDiskDeployment = uploadFileFromDiskDeployment;
