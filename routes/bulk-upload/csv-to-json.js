const moment = require('moment');
const csv = require("csvtojson");
module.exports = async (req, res, next) => {
    try {
        const jsonArray = await csv().fromFile(req.file.path);
        req.body["jsonArray"] = jsonArray;
        next();
    } catch (e) {
        return res.status(500).json({
            timestamp: moment().unix(),
            success: false,
            message: "Caught Exception!",
            errorMessage: e.message
        });
    }
}