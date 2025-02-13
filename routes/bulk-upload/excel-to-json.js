const moment = require('moment');
const xlsx = require('xlsx');
const fs = require('fs');
const Validator = require('node-input-validator');

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

        //await checkValidations(req, res, workbook, sheetNames)
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

const checkValidations = (req, res, workbook, sheetNames) => {
    return new Promise((resolve, reject) => {
        const validationResults = {}; // Object to store validation results for each sheet

        for (const sheetName of sheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const sheetValidationErrors = []; // Array to store validation errors for this sheet

            // Process your data here and add validation logic
            for (let row = 0; row < jsonData.length; row++) {
                const rowData = jsonData[row];

            }

            // Store the validation results for this sheet
            validationResults[sheetName] = sheetValidationErrors;
        }
        
        // Resolve the promise with the validation results
        resolve(validationResults);
    });
};
