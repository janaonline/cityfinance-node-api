const blobService = require("./blob_service");
const {MIME_TYPE} = require('../util/Mime_Types');
const Response = require("./response");
const {ENV} = require('./../util/FormNames')

module.exports = async function (req, res) {
    try {
        if (req.body && Array.isArray(req.body)) {
            let data = [];
            for (single of req.body) {
                let fileExt =  
                single.file_name?.lastIndexOf(".") > 0
                  ? single.file_name.substring(single.file_name?.lastIndexOf(".")+1)
                  : "";
                if(!single?.mime_type || !MIME_TYPE[fileExt].includes(single.mime_type)){
                    return Response.BadRequest(res,{},"Wrong Arguments")
                }
                const params = {
                    folder: single.folder,
                    file_name: encodeURIComponent(single.file_name), 
                    mime_type: single.mime_type
                }
                data.push(blobService.generateSignedUrl(params));
            }
            let resolved = await Promise.all(data);
            return res.status(200).json({ success: true, data: resolved });
        } else {
            return res.status(400).json({ success: false, data: req.body });
        }
    } catch (err) {
        return res.status(500).json({ message: "Something went wrong!" });
    }
};

const STORAGE_URL = {
    AWS_S3: {
        STG: process.env.AWS_STORAGE_URL_STG,
        PROD: process.env.AWS_STORAGE_URL_PROD
    },
    AZURE: {
        STG: process.env.AZURE_STORAGE_URL_STG,
        PROD: process.env.AZURE_STORAGE_URL_PROD
    }
};
/**
 * The function `getStorageBaseUrl` returns the base URL for a given storage and environment.
 * @returns the base URL for a given storage and environment. If the environment is not "prod", it
 * returns the base URL for the staging environment. Otherwise, it returns the base URL for the
 * production environment.
 */
function getStorageBaseUrl(){
    storage = getCurrentStorage()
    try {
        if(ENV.prod !== process.env.ENV){
            return STORAGE_URL[storage]['STG']
        }
        return STORAGE_URL[storage]['PROD'];
    } catch (error) {
        throw {message: `getStorageBaseUrl:: ${error.message}`}
    }
}


function getCurrentStorage(){
    return 'AWS_S3';
}

module.exports.getCurrentStorage = getCurrentStorage
module.exports.getStorageBaseUrl = getStorageBaseUrl