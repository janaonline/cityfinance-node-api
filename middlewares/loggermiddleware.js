const loggerModel = require("../models/RequestLogger")
/**
 * middleware that save logs in database  for incoming requests
 * @param {Object} req 
 * @param {Object} res 
 */
const createLog = async(req,res)=>{
    let apiUrl = req.originalUrl
    let diff = (new Date(req._startTime) - new Date()) / 1000
    try{
        if(req.method === "POST" || req.method === "PUT"){
            let dataObj = {
                "url":apiUrl,
                "userRole":req?.decoded?.role || null,
                "reqMethod":req.method,
                "currentUrl":req.currentUrl,
                "token":req.headers['x-access-token'],
                "reqBody":{
                    "body":req.body,
                    "params":req.params || null,
                    "query":req.query || null
                },
                "responseSent":{
                    body:req.res.__custombody__
                },
                "statusCode":req.res.statusCode,
                "completed":req.res.finished ? true : false,
                "respTime":diff
            }
            try{
                //saving logs in the database
                let logs = new loggerModel(dataObj)
                await logs.save()                
            }
            catch(err){
                console.log("error while saving logs::",err.message)
            }
           
        }
    }
    catch(err){
        console.log("error while creating logs :: ",err.message)
    }
}

/**
 * middleware that sets response body to save logs in database
 * @param {Object} req 
 * @param {Object} res 
 * @param {function} next 
 */
const setResponseBody = (req, res, next) => {
    try{
        const oldWrite = res.write
        const oldEnd = res.end
        chunks = [];
        res.write = function (chunk) {
            chunks.push(Buffer.from(chunk));
            oldWrite.apply(res, arguments);
        };
        res.end = function (chunk) {
            if (chunk) {
                chunks.push(Buffer.from(chunk));
            }
            const body = Buffer.concat(chunks).toString('utf8');
            res.__custombody__ = body;
            oldEnd.apply(res, arguments);
        };
    }
    catch(err){
        console.log("error in setResponseBody ::: ",err)
    }
    next();
    return;
};


exports.logger = {
        createLog,
        setResponseBody
}
