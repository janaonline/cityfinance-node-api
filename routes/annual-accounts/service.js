
const catchAsync = require('../../util/catchAsync')
const AnnualAccountData = require('../../models/AnnualAccounts')
const ObjectId = require('mongoose').Types.ObjectId;
const Ulb = require('../../models/Ulb')
const Year = require('../../models/Year')

module.exports.sendAnnualAccountsData = catchAsync(async (req, res, next) => {

    let user = req.decoded;
    let data = req.body
    if (!user) {
        return res.status(400).json({
            success: false,
            message: 'User Not Found',
        })
    }

    if (user.role == 'ULB') {

        let ulb = await Ulb.findOne({ _id: ObjectId(user.ulb) });
        if (!ulb) {
            return res.status(400).json({
                success: false,
                message: 'ULB Not Found',
            })
        }
        if (!data.submit_annual_accounts.answer || !data.submit_standardized_data.answer) {
            return res.status(400).json({
                success: false,
                message: 'Must Answer the Question before Submit',
            })
        }
        let design_year = await Year.findOne({ "year": data.design_year })
        if (!design_year) {
            return res.status(400).json({
                success: false,
                message: 'Design Year Not Found',
            })
        }
        let year = await Year.findOne({ "year": data.year })
        if (!year) {
            return res.status(400).json({
                success: false,
                message: 'Year Not Found',
            })
        }
        if (data.year === '2019-20') {
            data.audit_status = 'Audited';
        } else if (data.year === '2020-21') {
            data.audit_status = 'Unaudited';
        }
        if (data.year === '2019-20' && !data.files.auditor_report.pdfUrl) {
            return res.status(400).json({
                success: false,
                message: 'Must Submit Audit Report (PDF Format)',
            })
        }
        if (data.year != '2019-20' && data.files.auditor_report.pdfUrl) {
            delete data.files.auditor_report;
        }

        if (data.submit_annual_accounts.answer.toLowerCase() === 'no' && data.submit_standardized_data.answer.toLowerCase() === 'no') {
            data.files = null;
        }
        else if (data.submit_annual_accounts.answer.toLowerCase() === 'yes' && data.submit_standardized_data.answer.toLowerCase() === 'no') {
            if (data.files.standardized_data.excelUrl)
                delete data.files.standardized_data;
        }
        else if (data.submit_annual_accounts.answer.toLowerCase() === 'no' && data.submit_standardized_data.answer.toLowerCase() === 'yes') {
            let { standardized_data } = data.files
            data.files = {};
            Object.assign(data.files, { standardized_data })
        }


        data.design_year = ObjectId(design_year._id);
        data.year = ObjectId(year._id);
        let files = data.files
        delete data.files
        Object.assign(data, files)
        console.log(data)
        if (data.standardized_data.excelUrl) {
            //download the file from the server
            //verify it
        }
        let query = { "ulb": ObjectId(ulb._id), "year": ObjectId(year._id) }
        let annualAccountData = await AnnualAccountData.findOne(query);
        if (annualAccountData && annualAccountData.isCompleted && annualAccountData.status === 'PENDING') {
            return res.status(400).json({
                success: false,
                message: 'Data Already Submitted for ' + user.name + '. You can re-submit the data after Action is taken by State Govt and MoHUA'
            })
        }
        data['status'] = 'PENDING';
        if (annualAccountData && annualAccountData.isCompleted) {
            req.body['history'] = [...annualAccountData.history];
            annualAccountData.history = undefined;
            req.body['history'].push(annualAccountData);
            await AnnualAccountData.updateOne(query, data, { runValidators: true, setDefaultsOnInsert: true })
                .then((response) => {
                    res.status(200).json({
                        success: true,
                        message: 'Annual Accounts Data Updated for ' + user.name,
                        response: response
                    })
                }

                ).catch(e => {
                    console.log(`Error - ${e}`);
                    res.status(400).json({
                        success: false,
                        message: 'Failed to Update Annual Accounts Data for ' + user.name,
                        error: e.message
                    })
                })

        }
        else if (annualAccountData && !annualAccountData.isCompleted) {
            return res.status(400).json({
                success: false,
                message: 'Action Not Allowed. Data is in Draft Mode.',
            })
        }
        else {
            const annual_account_data = new AnnualAccountData(data);
            await annual_account_data.save();
            return res.status(200).json({
                success: true,
                message: 'Annual Accounts for ' + user.name + ' Successfully Submitted. ',
            })
        }
    } else {
        return res.status(400).json({
            success: false,
            message: !user.role ? 'User.Role Does Not Exist' : user.role + ' is not Authenticated to Perform this Action. Only ULB Users Allowed.',
        })
    }


    async function processData(reqFile, financialYear, reqId, balanceSheet) {
        try {
            try {
                console.log('entered process data')
                // extract the overviewSheet and dataSheet
                let { overviewSheet, dataSheet } = await readXlsxFile(reqFile);
                // validate overview sheet 
                //console.log(dataSheet);return;    
                console.log(overviewSheet)
                let objOfSheet = await validateOverview(overviewSheet, financialYear); // rejection in case of error
                delete objOfSheet['state'];
                objOfSheet['state'] = objOfSheet.state_name;
                console.log(objOfSheet)
                let du = {
                    query: { ulb_code_year: objOfSheet.ulb_code_year },
                    update: Object.assign({ lastModifiedAt: new Date() }, objOfSheet),
                    options: { upsert: true, setDefaultsOnInsert: true, new: true }
                }
                delete du.update._id;
                delete du.update.__v;

                // insert the oviewViewSheet content in ledger logs
                let ud = await LedgerLog.findOneAndUpdate(du.query, du.update, du.options);

                // validate the input sheet data, like validating balance sheet, removing empty line items, removing comma seprations, converting negative values etc.
                let inputDataArr = await validateData(dataSheet, objOfSheet, balanceSheet); //  return line item data array
                let responseArr = [];

                let aborted = false;
                for (let el of inputDataArr) {
                    let options = el.options;//Object.assign(el.options,{session:session});
                    try {
                        let result = await UlbLedger.findOneAndUpdate(el.query, el.update, options);
                        responseArr.push(result);

                        // Update in the request log collection, the current status of file
                        await updateLog(reqId, { message: `Status: (${responseArr.length}/${inputDataArr.length}) processed`, completed: 0 });
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
    async function readXlsxFile(file) {
        return new Promise(async (resolve, reject) => {
            let exceltojson;
            try {
                let fileInfo = file.path.split('.');
                console.log(fileInfo)
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
    async function validateOverview(data, financialYear) {
        return new Promise(async (resolve, reject) => {
            if (data.length < 2) {
                // means less than two entries are there in the sheet;
                console.log("validateOverview : data.length < 2")
                reject({ message: "Overview sheet has less than two rows, Please check" });
            } else {

                let d = Object.keys(data[0]);
                var filtered = d.filter(function (el) { return el; });
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

                for (let key of Object.keys(objOfSheet)) {
                    objOfSheet[overViewSheet[key]] = objOfSheet[key];
                    delete objOfSheet[key];
                }

                // Find whether state code exists or not
                let state = await State.findOne({ code: objOfSheet.state_code, isActive: true }).exec();
                // Find whether ulb code exists or not
                let ulb = await Ulb.findOne({ code: objOfSheet.ulb_code, state: state._id, isActive: true }).exec();
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
                console.log(objOfSheet)
            }
        });
    }
    async function validateData(data, objOfSheet, balanceSheet) {
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

                for (let i = 0; i < inputHeader.length; i++) {
                    let name = inputHeader[i].toLowerCase();
                    if (filtered.indexOf(name) === -1) {
                        reject({ message: "Input sheet header name mismatch" });
                    }
                }
            }
            for (let eachRow of data) {
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
                        dataArr.push({
                            query: {
                                ulb: objOfSheet._id,
                                lineItem: el,
                                financialYear: financialYear
                            }, update: {
                                amount: objOfSheet.ledger[el]
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
        if (balanceSheet.liability != balanceSheet.assets) {
            // If balance sheet doesn't matches
            message = "Balance sheet has liability: " + balanceSheet.liability + " while assets :" + balanceSheet.assets;
        }
        return message;
    }


})

