const moment = require("moment");
const RequestLog = require("../../models/RequestLog")
const downloadFileToDisk = require("../file-upload/service").downloadFileToDisk;
const xlstojson = require("xls-to-json-lc");
const xlsxtojson = require("xlsx-to-json-lc");
const CONSTANTS = require('../../_helper/constants');
const State = require("../../models/State")
const Ulb = require("../../models/Ulb");
const LineItem = require("../../models/LineItem");
const UlbLedger = require("../../models/UlbLedger");
const LedgerLog = require("../../models/LedgerLog");
const Redis = require('../../service/redis')
const ObjectId = require('mongoose').Types.ObjectId;
const Year = require('../../models/Year')

const overViewSheet = {
    'State Code': 'state_code',
    'Name of the state': 'state',
    'ULB Code': 'ulb_code',
    'Name of the ULB': 'ulb',
    'Financial Year': 'year',
    'Audit Status': 'audit_status',
    'Audit Firm Name': 'audit_firm',
    'Name of the Partner': 'partner_name',
    'ICAI Membership Number': 'icai_membership_number',
    'Date of Entry': 'created_at',
    'Entered by': 'created_by',
    'Date of verification': 'verified_at',
    'Verified by': 'verified_by',
    'Date of Re-verification': 'reverified_at',
    'Re-verified by': 'reverified_by'
};
const inputHeader = ["Head of Account", "Code", "Line Item", "Amount in INR"];
const overviewHeader = ["Basic Details", "Value"];

module.exports = function (req, res) {
    try {
        let user = req.decoded;
        let data = req.body;
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'User Not Found!'
            })
        }
        let financialYear = req.body.financialYear;
        // maintaining list items which needs to get sum up in liability and assets
        const balanceSheet = {
            liability: 0,
            assets: 0,
            liabilityAdd: ['310', '311', '312', '320', '330', '331', '340', '341', '350', '360', '300'],
            assetsAdd: ['410', '411', '412', '420', '421', '430', '431', '432', '440', '450', '460', '461', '470', '480', '400']
        }

        if (!financialYear) {
            return res.status(400).json({
                timestamp: moment().unix(),
                success: false,
                message: "Financial Year is required."
            });
        } else {

            downloadFileToDisk(req.body.alias, async (err, file) => {
                if (err) {
                    return res.status(400).json({
                        timestamp: moment().unix(),
                        success: false,
                        message: "Error Occurred",
                        error: err.message
                    });
                } else if (!file) {
                    return res.status(400).json({
                        timestamp: moment().unix(),
                        success: false,
                        message: "File not available"
                    });
                } else {
                    try {
                        let design_year;
                        let query = { url: req.body.alias, financialYear: financialYear };
                        if (data.design_year && data.design_year != "" && user.role === 'ULB') {
                            design_year = data.design_year;
                            Object.assign(query,
                                {
                                    design_year: ObjectId(design_year),
                                    ulb: ObjectId(user.ulb)
                                }
                            )
                        }
                        // console.log(query)
                        let reqLog = await RequestLog.findOne(query);
                        if (!reqLog) {
                            let requestLog = new RequestLog({
                                user: req.decoded ? ObjectId(req.decoded.id) : null,
                                url: req.body.alias,
                                message: "Data Processing",
                                financialYear: financialYear,
                                design_year: (data.design_year && user.role === 'ULB') ? ObjectId(design_year) : undefined,
                                ulb: user.role === 'ULB' ? ObjectId(user.ulb) : undefined
                            });
                            requestLog.save(async (err, data) => {
                                if (err) {
                                    return res.status(400).json({
                                        timestamp: moment().unix(),
                                        success: false,
                                        message: err.message,
                                        data: err
                                    })
                                } else {
                                    try {

                                      await processData(file, financialYear, data._id, balanceSheet, design_year, user);
                                        return res.status(200).json({
                                            timestamp: moment().unix(),
                                            success: true,
                                            message: `Request recieved.`,
                                            data: data
                                        })
                                    } catch (e) {
                                        return res.status(400).json({
                                            timestamp: moment().unix(),
                                            success: false,
                                            message: `${e.message} \n ${e.errMessage}.`
                                        })
                                    }

                                }
                            });

                        } else {
                            return res.status(400).json({
                                timestamp: moment().unix(),
                                success: false,
                                message: reqLog.completed ? `Already processed.` : `Already in process.`,
                                data: reqLog
                            })
                        }
                    } catch (e) {
                        return res.status(400).json({
                            timestamp: moment().unix(),
                            success: false,
                            message: `Caught Error:${e.message}`
                        })
                    }
                }
            })

        }
        async function processData(reqFile, financialYear, reqId, balanceSheet, design_year, user) {
            try {
                try {

                    // extract the overviewSheet and dataSheet
                    let { overviewSheet, dataSheet } = await readXlsxFile(reqFile, design_year, user.role);
                    console.log(">>>>>>.visited here")
                    // validate overview sheet 

                    let objOfSheet
                    if (overviewSheet != null) {
                        objOfSheet = await validateOverview(overviewSheet, financialYear); // rejection in case of error
                    } else if (overviewSheet == null) {
                        objOfSheet = {
                            ulb_id: ObjectId(user.ulb),
                            financialYear: (financialYear),
                            design_year: ObjectId(design_year)
                        }
                    }
                    let query;
                    if (user.role != 'ULB' && !design_year) {
                        delete objOfSheet['state'];
                        objOfSheet['state'] = objOfSheet.state_name;
                        query = {
                            ulb_code_year: objOfSheet.ulb_code_year
                        }

                        let du = {
                            query,
                            update: Object.assign({ lastModifiedAt: new Date() }, objOfSheet),
                            options: { upsert: true, setDefaultsOnInsert: true, new: true }
                        }
                        delete du.update._id;
                        delete du.update.__v;

                        // insert the oviewViewSheet content in ledger logs
                        let ud = await LedgerLog.findOneAndUpdate(du.query, du.update, du.options);

                    } else if (user.role === 'ULB' && design_year) {
                        query = {
                            ulb_id: ObjectId(user.ulb),
                            financialYear: (financialYear),
                            design_year: ObjectId(design_year)
                        }
                    }


                    // validate the input sheet data, like validating balance sheet, removing empty line items, removing comma seprations, converting negative values etc.
                    let inputDataArr = await validateData(dataSheet, objOfSheet, balanceSheet, design_year, user); //  return line item data array
                    // console.log(inputDataArr)
                    let responseArr = [];
                    let aborted = false;
                    for (let el of inputDataArr) {
                        let options = el.options;//Object.assign(el.options,{session:session});
                        try {
                            if (user.role != 'ULB' && !design_year) {
                                // console.log('!ULB')
                                let result = await UlbLedger.findOneAndUpdate(el.query, el.update, options);
                                responseArr.push(result);
                                // Update in the request log collection, the current status of file
                                await updateLog(reqId, { message: `Status: (${responseArr.length}/${inputDataArr.length}) processed`, completed: 0 });
                            } else {
                                // console.log('ULB')
                                await updateLog(reqId, { message: `Status: 1 processed`, completed: 0 });
                            }

                            continue;
                        } catch (e) {

                            // Update in the request log collection, the current status of file
                            aborted = true;
                            await updateLog(reqId, { message: e.message, completed: 0, status: "FAILED" });
                            console.log("Exception", e);
                            break;
                        }
                    }
                    if (aborted) {
                        await updateLog(reqId, { completed: 0, status: "FAILED" });
                    } else {
                        //await session.commitTransaction();
                        console.log('updating Log function executed')
                        await updateLog(reqId, { message: `Completed`, completed: 1, status: "SUCCESS" });
                        Redis.resetDashboard();
                    }

                } catch (e) {
                    console.log("processData: Caught Exception", e.message, e);
                    await updateLog(reqId, { message: e.message, completed: 0, status: "FAILED" });
                }
            } catch (e) {
                console.log("Exception Caught while extracting file => ", e);
                errors.push("Exception Caught while extracting file");
                await updateLog(reqId, { message: e.message, completed: 0, status: "FAILED" });
            }
        }
        async function readXlsxFile(file, design_year, role) {
            if (role === 'ULB' && design_year) {
                console.log('entered new if')
                return new Promise(async (resolve, reject) => {
                    let exceltojson;
                    try {
                        let fileInfo = file.path.split('.');
                        exceltojson = fileInfo && fileInfo.length > 0 && fileInfo[(fileInfo.length - 1)] == 'xlsx' ? xlsxtojson : xlstojson;

                        let prms2 = new Promise((rslv, rjct) => {
                            exceltojson({
                                input: file.path,
                                output: null, //since we don't need output.json
                                lowerCaseHeaders: true,
                                sheet: CONSTANTS.LEDGER.BULK_ENTRY.INPUT_SHEET_NAME,
                            }, function (err, sheet) {
                                if (err) {
                                    rjct({ message: "Error: INPUT_SHEET_NAME" })
                                } else {
                                    rslv(sheet)
                                }
                            })
                        })
                        Promise.all([prms2]).then(sheet => {
                            let dataSheet = sheet[0];
                            let overviewSheet = null;
                            if (dataSheet) {
                                resolve({ overviewSheet, dataSheet });
                            } else {
                                console.log("readXlsxFile: sheet count")
                                reject({ message: "Two sheet is required in the file." });
                            }
                        }, e => {
                            reject(e);
                        }).catch(e => {
                            reject(e);
                        })
                    } catch (e) {
                        console.log("readXlsxFile: Exception", e)
                        reject({ message: "Caught Exception while reading file.", errMessage: e.message });
                    }
                });


            } else {
                console.log('entered old if')
                return new Promise(async (resolve, reject) => {
                    let exceltojson;
                    try {
                        let fileInfo = file.path.split('.');
                        exceltojson = fileInfo && fileInfo.length > 0 && fileInfo[(fileInfo.length - 1)] == 'xlsx' ? xlsxtojson : xlstojson;
                        let prms1 = new Promise((rslv, rjct) => {
                            exceltojson({
                                input: file.path,
                                output: null, //since we don't need output.json
                                lowerCaseHeaders: true,
                                sheet: CONSTANTS.LEDGER.BULK_ENTRY.OVERVIEW_SHEET_NAME,
                            }, function (err, sheet) {
                                if (err) {
                                    rjct({ message: "Error: OVERVIEW_SHEET_NAME" })
                                } else {
                                    rslv(sheet)

                                }
                            })
                        })
                        let prms2 = new Promise((rslv, rjct) => {
                            exceltojson({
                                input: file.path,
                                output: null, //since we don't need output.json
                                lowerCaseHeaders: true,
                                sheet: CONSTANTS.LEDGER.BULK_ENTRY.INPUT_SHEET_NAME,
                            }, function (err, sheet) {
                                if (err) {
                                    rjct({ message: "Error: INPUT_SHEET_NAME" })
                                } else {
                                    rslv(sheet)
                                }
                            })
                        })
                        Promise.all([prms1, prms2]).then(sheets => {
                            let overviewSheet = sheets[0];
                            let dataSheet = sheets[1];
                            if (overviewSheet && dataSheet) {
                                resolve({ overviewSheet, dataSheet });
                            } else {
                                console.log("readXlsxFile: sheet count")
                                reject({ message: "Two sheet is required in the file." });
                            }
                        }, e => {
                            reject(e);
                        }).catch(e => {
                            reject(e);
                        })
                    } catch (e) {
                        console.log("readXlsxFile: Exception", e)
                        reject({ message: "Caught Exception while reading file.", errMessage: e.message });
                    }
                });
            }

        }
        async function validateOverview(data, financialYear) {
            return new Promise(async (resolve, reject) => {
                if (data.length < 2) {
                    // means less than two entries are there in the sheet;
                    console.log("validateOverview : data.length < 2")
                    reject({ message: "Overview sheet has less than two rows, Please check" });
                } else {
                    let d = Object.keys(data[0]);
                    var filtered = d.filter(function (el) { return el; });
                    console.log(filtered)
                    if (filtered.length != overviewHeader.length) {
                        console.log("===>overview header is missing");
                        reject({ message: "Overview header is missing" });
                    }
                    else {
                        for (let i = 0; i < overviewHeader.length; i++) {
                            let name = overviewHeader[i].toLowerCase();
                            if (filtered.indexOf(name) === -1) {
                                reject({ message: "Overview header name mismatch" });
                            }
                        }
                    }

                    let objOfSheet = {};
                    for (let eachRow of data) {
                        // converting data in rows here in obj;
                        eachRow["basic details"] ? objOfSheet[eachRow["basic details"]] = eachRow.value : "Means row is empty remove it"
                    }
                    console.log(objOfSheet)
                    for (let key of Object.keys(objOfSheet)) {
                        objOfSheet[overViewSheet[key]] = objOfSheet[key];
                        delete objOfSheet[key];
                    }
                    // console.log(objOfSheet)
                    // Find whether state code exists or not
                    let state = await State.findOne({ code: objOfSheet.state_code, isActive: true }).exec();
                    // console.log(state)
                    // Find whether ulb code exists or not
                    let ulb = await Ulb.findOne({
                      code: objOfSheet.ulb_code,
                      state: state._id,
                    //   isActive: true,
                    }).exec();
                    // console.log(ulb)
                    if (!state) {
                        console.log("validateOverview: !state")
                        reject({ message: "State code " + objOfSheet.state_code + " or " + " State name " + objOfSheet.state + " do not exists in states master" });
                    } else if (!ulb) {
                        console.log("validateOverview: !ulb")
                        reject({ message: "Ulb code " + objOfSheet.ulb_code + " do not exists in ulb's master for " + objOfSheet.state_code + " state" });
                    } else if (objOfSheet.year != financialYear) {
                        console.log("validateOverview: objOfSheet.year != financialYear")
                        reject({ message: "Selected financial year: " + financialYear + " while sheet has year:" + objOfSheet.year })
                    }
                    Object.assign(objOfSheet, JSON.parse(JSON.stringify(ulb)));
                    objOfSheet['ulb_code_year'] = objOfSheet.ulb_code + '_' + objOfSheet.year;
                    objOfSheet['state_name'] = state.name;
                    resolve(objOfSheet)
                }
            });
        }
        async function validateData(data, objOfSheet, balanceSheet, design_year, user) {
            return new Promise(async (resolve, reject) => {
                let inputSheetObj = {}
                let errors = [];

                let d = Object.keys(data[0]);
                var filtered = d.filter(function (el) { return el; });
                if (filtered.length != inputHeader.length) {
                    console.log("===>Input sheet header is missing");
                    reject({ message: "Input sheet header is missing" });
                }
                else {
                    // console.log(filtered)
                    for (let i = 0; i < inputHeader.length; i++) {
                        let name = inputHeader[i].toLowerCase();
                        if (filtered.indexOf(name) === -1) {
                            reject({ message: "Input sheet header name mismatch" });
                        }
                    }
                }
                let fieldsWithCode=0, fieldsWithNoAmount= 0;
                for (let eachRow of data) {
                    if (eachRow["code"]) {
                      fieldsWithCode++;
                      /* Checking if the amount in inr is empty or not. If it is empty, it is incrementing the
fieldsWithNoAmount variable. */
                      !eachRow["amount in inr"] ? fieldsWithNoAmount++ : "";
                    }
                    // removing all the - values and converting them to 0
                    eachRow["amount in inr"] = eachRow["amount in inr"] == "-" ? eachRow["amount in inr"] = "0" : eachRow["amount in inr"];
                    // removing commas from all the values
                    eachRow["amount in inr"] = (eachRow["amount in inr"] !== undefined) && (eachRow["amount in inr"] == eachRow["amount in inr"].trim() != '') ? eachRow["amount in inr"].replace(/\,/g, '') : '';

                    // removing brackets from values and converting them to -ve values
                    if ((eachRow["amount in inr"] !== undefined) && (eachRow["amount in inr"].indexOf('(') > -1 && eachRow["amount in inr"].indexOf(')') > -1))
                        eachRow["amount in inr"] = "-" + eachRow["amount in inr"].replace("(", "").replace(")", "")

                    if (eachRow["code"]) {
                        inputSheetObj[eachRow["code"].trim()] = Number(eachRow["amount in inr"]);
                        if (isNaN(inputSheetObj[eachRow["code"].trim()])) {
                            errors.push("Line item code " + eachRow["code"] + " value is not applicable");
                        }
                    }
                }
                if (fieldsWithCode === fieldsWithNoAmount) {
                  errors.push("File cannot be blank");
                }
                var message = validateBalanceSheet(balanceSheet, inputSheetObj);

                if (message) {
                    // if balance sheet is invalid, means sum doesn't matches
                    console.log("validateData: message", message)
                    reject({ message: message });
                } else {

                    let lineItemCodes = Object.keys(inputSheetObj);
                    for (let el of lineItemCodes) {
                        // Validate each line Item, whether applicable or not
                        const validateLI = await LineItem.findOne({ code: el, isActive: true }).exec();
                        if (!validateLI) {
                            errors.push("Invalid Item code " + el + " found in the sheet");
                        } else {
                            // console.log('line item is valid')
                            // assign the unique id of line item to inputSheetObj
                            inputSheetObj[validateLI._id] = inputSheetObj[el]
                            delete inputSheetObj[el]
                        }
                    }
                    if (errors.length) {
                        console.log("validateData: errors.length", errors)
                        reject({ message: errors.join(","), errMessage: "" })
                    } else {
                        Object.assign(objOfSheet, { ledger: JSON.parse(JSON.stringify(inputSheetObj)) });
                        let dataArr = [];
                        for (let el of Object.keys(objOfSheet.ledger)) {
                            let query = {
                                ulb: objOfSheet._id,
                                lineItem: el,
                                financialYear: financialYear
                            };
                            if (design_year && user.role === 'ULB') {
                                query = {
                                    ulb: ObjectId(user.ulb),
                                    lineItem: el,
                                    financialYear: financialYear,
                                    design_year: ObjectId(design_year)
                                }

                            }
                            dataArr.push({
                                query,
                                update: {
                                    amount: objOfSheet.ledger[el],
                                    audit_status:objOfSheet.audit_status
                                }, options: {
                                    upsert: true,
                                    setDefaultsOnInsert: true,
                                    new: true
                                }
                            });
                        }
                        resolve(dataArr);
                    }
                }
            });
        }
        async function updateLog(reqId, data) {
            return new Promise(async (resolve, reject) => {
                try {
                    let d = await RequestLog.update({ _id: reqId }, { $set: data });
                    // console.log(d)
                    resolve(d);
                } catch (e) {
                    console.log("updateLog: Caught Exception.", e)
                    reject({ message: "Exception while updating the status.", err: e.message });
                }
            });
        }
        function validateBalanceSheet(balanceSheet, inputSheetObj) {
            let message = "";

            // iterate over each line items present in the input sheet
            for (let key of Object.keys(inputSheetObj)) {

                if (balanceSheet.liabilityAdd.includes(key)) {
                    // line item is of liability, then add its value
                    balanceSheet.liability += inputSheetObj[key]
                } else if (balanceSheet.assetsAdd.includes(key)) {
                    // line item is of assets, then add its value
                    balanceSheet.assets += inputSheetObj[key]
                }
            }
            // for checking this non numeric case;
            if(isNaN(balanceSheet?.liability) || isNaN(balanceSheet?.assets) ){
                message = "Please enter valid amount in Balance Sheet"
                return message;
            }
            if (balanceSheet.liability != balanceSheet.assets) {
                // If balance sheet doesn't matches
                message = "Balance sheet has liability: " + balanceSheet.liability + " while assets :" + balanceSheet.assets;
            }
            return message;
        }
    } catch (e) {
        return res.json({
            success: false,
            message: e.message
        })
    }
}

