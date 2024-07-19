const loggerModel = require("../models/RequestLogger")
/**
 * middleware that save logs in database  for incoming requests
 * @param {Object} req 
 * @param {Object} res 
 */
const createLog = async (req, res) => {
    const apiUrl = req.originalUrl
    const diff = (new Date() - new Date(req._startTime)) / 1000
    try {
        const ignoredUrls = ['/recentSearchKeyword/search', '/ulb-list', '/states-with-ulb-count'];
        if (['PUT', 'POST'].includes(req.method) && !req.url.split("/").includes("login") && !ignoredUrls.includes(req.route.path)) {
            const dataObj = {
                "url": apiUrl,
                "userRole": req?.decoded?.role || null,
                "reqMethod": req.method,
                "currentUrl": req.currentUrl,
                "token": req.headers['x-access-token'],
                "reqBody": {
                    "body": req.body,
                    "params": req.params || null,
                    "query": req.query || null
                },
                "responseSent": {
                    body: res.__custombody__
                },
                "statusCode": req.res.statusCode,
                "completed": req.res.finished ? true : false,
                "respTime": diff
            }
            try {
                //saving logs in the database
                const logs = new loggerModel(dataObj)
                await logs.save()
            }
            catch (err) {
                console.log("error while saving logs::", err.message)
            }

        }
    }
    catch (err) {
        console.log("error while creating logs :: ", err.message)
    }
}
/**
 * middleware that sets response body to save logs in database
 * @param {Object} req 
 * @param {Object} res 
 * @param {function} next 
 */
const setResponseBody = (req, res, next) => {
    try {
        const json = res.json
        res.json = function (obj) {
            res.__custombody__ = obj;
            json.apply(res, arguments);
        };
    }
    catch (err) {
        console.log("error in setResponseBody ::: ", err)
    }
    next();
    return;
};
exports.logger = {
    createLog,
    setResponseBody
}
