const uuid = require('uuid');
const fs = require("fs");
const urlencode = require("urlencode");
const baseDir = "uploads/";
const generateSignedUrl  = function(data) {
    return new Promise((resolve, reject)=>{
        let dir = "objects";
        if (!fs.existsSync(baseDir)){
            fs.mkdirSync(baseDir);
            console.log("Created Dir",baseDir);
        }
        if (!fs.existsSync(baseDir+dir)){
            fs.mkdirSync(baseDir+dir);
            console.log("Created Dir",baseDir+dir);
        }
        let file_name = data.file_name;
        let file_extension = file_name.substring(file_name.lastIndexOf('.'));
        let file_alias = dir+"/"+uuid.v4() + file_extension;
        try{
            fs.closeSync(fs.openSync(baseDir+file_alias, 'w'));
            data["url"] = data.host+"/api/admin/v1/putDataIntoFile/"+urlencode(file_alias);
            data["file_alias"] = data.host+"/"+file_alias;
            resolve(data)
        }catch (e) {
            reject(e);
        }
    });
}
const putData = function (filepath,req) {
    let path  = baseDir+filepath;
    console.log("P",path);
    return new Promise(async(resolve, reject)=>{
        try{
            let p = urlencode.decode(path);
            let size = getFilesizeInBytes(p);
            console.log("P",p,size);
            if(!size){
                let stream = createWriteStreamSync(p, {flags:'a'});
                req.on("data",(chunk)=>{
                    stream.write(chunk);
                });
                req.on("end",()=>{
                    stream.end();
                    resolve("uploaded");
                })
            }else{
                resolve("Already uploaded:"+size);
            }
        }catch (e) {
            console.log("Exception",e);
            reject(e);
        }
    });
}
const createWriteStreamSync = function(file, options) {
    if (!options)
        options = {};
    if (!options.flags)
        options.flags = 'w';
    if (!options.fd)
        options.fd = fs.openSync(file, options.flags);
    return fs.createWriteStream(null, options);
}
const getFilesizeInBytes = function(filename) {
    var stats = fs.statSync(filename)
    var fileSizeInBytes = stats["size"]
    return fileSizeInBytes
}
module.exports = {
    generateSignedUrl:generateSignedUrl,
    putData:putData
}
