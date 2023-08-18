const moment = require('moment');
const xlsx = require('xlsx');
const fs = require('fs');

module.exports = (expectedSheetNames) => async (req, res, next) => {
    try {
        const filePath = req.file.path;
        const workbook = xlsx.readFile(filePath);
        const sheetNames = workbook.SheetNames;

        // Validate sheet names
        const invalidSheetNames = sheetNames.filter(name => !expectedSheetNames.includes(name));
        if (invalidSheetNames.length > 0) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ success: false, message: `Invalid sheet names: ${invalidSheetNames.join(', ')}` });
        }

        const jsonArray = {};

        for (const sheetName of sheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: null, raw: false });
            jsonArray[sheetName] = jsonData;
        }

        // Remove the uploaded file after processing
        fs.unlinkSync(filePath);
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