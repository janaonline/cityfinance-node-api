
const moment = require("moment");
const catchAsync = require('../../util/catchAsync')
const AnnualAccountData = require('../../models/AnnualAccounts')
const ObjectId = require('mongoose').Types.ObjectId;
const Ulb = require('../../models/Ulb')
const Year = require('../../models/Year')
const User = require('../../models/User')
const Response = require('../../service').response
const State = require('../../models/State');
const downloadFileToDisk = require("../file-upload/service").downloadFileToDisk;
const RequestLog = require("../../models/RequestLog")
const xlstojson = require("xls-to-json-lc");
const xlsxtojson = require("xlsx-to-json-lc");
const CONSTANTS = require('../../_helper/constants');
const LineItem = require("../../models/LineItem");
const UlbLedger = require("../../models/UlbLedger");
const LedgerLog = require("../../models/LedgerLog");
const Redis = require('../../service/redis')


const balanceSheet = {
    liability: 0,
    assets: 0,
    liabilityAdd: ['310', '311', '312', '320', '330', '331', '340', '341', '350', '360', '300'],
    assetsAdd: ['410', '411', '412', '420', '421', '430', '431', '432', '440', '450', '460', '461', '470', '480', '400']
}
const inputHeader = ["Head of Account", "Code", "Line Item", "Amount in INR"];
const overviewHeader = ["Basic Details", "Value"];

const time = () => {
    var dt = new Date();
    dt.setHours(dt.getHours() + 5);
    dt.setMinutes(dt.getMinutes() + 30);
    return dt;
};

const mappingKeys = {
    bal_sheet: 'bal_sheet',
    bal_sheet_schedules: 'bal_sheet_schedules',
    inc_exp: 'inc_exp',
    inc_exp_schedules: 'inc_exp_schedules',
    cash_flow_schedules: 'cash_flow_schedules',
    cash_flow: 'cash_flow',
    auditor_report: 'auditor_report'
};

const provisional_dataKeys = [
    'bal_sheet',
    'bal_sheet_schedules',
    'inc_exp',
    'inc_exp_schedules',
    'cash_flow_schedules',
    'cash_flow',
    'auditor_report'

];
module.exports.createOrUpdate = catchAsync(async (req, res, next) => {

    let user = req.decoded;
    let data = req.body
    if (!user) {
        return res.status(400).json({
            success: false,
            message: 'User Not Found',
        })
    }
    if (user.role === 'ULB') {
        let ulb = await Ulb.findOne({ _id: ObjectId(user.ulb) });
        if (!ulb) {
            return res.status(400).json({
                success: false,
                message: 'ULB Not Found',
            })
        }
        data['createdAt'] = time();
        data['modifiedAt'] = time();
        data['actionTakenBy'] = ObjectId(user._id);
        data['ulb'] = ObjectId(ulb._id);
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
        if (data.year === '2019-20' && !data.provisional_data.auditor_report.pdfUrl) {
            return res.status(400).json({
                success: false,
                message: 'Must Submit Auditor Report (PDF Format)',
            })
        }
        if (data.year != '2019-20' && data.provisional_data.auditor_report.pdfUrl) {
            delete data.provisional_data.auditor_report;
        }

        if (data.submit_annual_accounts.answer.toLowerCase() === 'no' && data.submit_standardized_data.answer.toLowerCase() === 'no') {
            delete data.provisional_data;
            delete data.standardized_data;
        }
        else if (data.submit_annual_accounts.answer.toLowerCase() === 'yes' && data.submit_standardized_data.answer.toLowerCase() === 'no') {
            delete data.standardized_data;
        }
        else if (data.submit_annual_accounts.answer.toLowerCase() === 'no' && data.submit_standardized_data.answer.toLowerCase() === 'yes') {
            delete data.provisional_data;
        }


        data.design_year = ObjectId(design_year._id);
        data.year = ObjectId(year._id);

        // let standardData = data.files.standardized_data;
        // delete data.files.standardized_data;
        // data.standardized_data = standardData;
        // let files = data.files
        // delete data.files;
        // let provisional_data = {};
        // Object.assign(provisional_data, files)
        // Object.assign(data, { provisional_data })
        console.log(data)
        if (data.standardized_data.excelUrl) {
            downloadFileToDisk(data.standardized_data.excelUrl, async (err, file) => {
                if (err) {
                    console.log(err)
                    // return res.status(400).json({
                    //     timestamp: moment().unix(),
                    //     success: false,
                    //     message: "Error Occurred",
                    //     error: err.message
                    // });
                } else if (!file) {
                    console.log('File not available')
                    // return res.status(400).json({
                    //     timestamp: moment().unix(),
                    //     success: false,
                    //     message: "File not available"
                    // });
                } else {
                    try {
                        let reqLog = await RequestLog.findOne({ url: data.standardized_data.excelUrl, financialYear: year.year });
                        if (!reqLog) {
                            let requestLog = new RequestLog({
                                user: req.decoded ? ObjectId(req.decoded.id) : null,
                                url: data.standardized_data.excelUrl,
                                message: "Data Processing",
                                financialYear: year.year
                            });
                            requestLog.save(async (err, data) => {

                                if (err) {
                                    // return res.status(400).json({
                                    //     timestamp: moment().unix(),
                                    //     success: false,
                                    //     message: err.message,
                                    //     data: err
                                    // })
                                    console.log(err)
                                } else {
                                    try {
                                        console.log(year.year)
                                        processData(file, year.year, data._id, balanceSheet);
                                        // return res.status(200).json({
                                        //     timestamp: moment().unix(),
                                        //     success: true,
                                        //     message: `Request recieved.`,
                                        //     data: data
                                        // })
                                    } catch (e) {
                                        // return res.status(400).json({
                                        //     timestamp: moment().unix(),
                                        //     success: false,
                                        //     message: `${e.message} \n ${e.errMessage}.`
                                        // })
                                        console.log(e)
                                    }

                                }
                            });

                        } else {
                            // return res.status(400).json({
                            //     timestamp: moment().unix(),
                            //     success: false,
                            //     message: reqLog.completed ? `Already processed.` : `Already in process.`,
                            //     data: reqLog
                            // })
                            console.log('aalready processed')
                        }
                    } catch (e) {
                        // return res.status(400).json({
                        //     timestamp: moment().unix(),
                        //     success: false,
                        //     message: `Caught Error:${e.message}`
                        // })
                        console.log(e)
                    }
                }
            })
        }
        let query = { "ulb": ObjectId(ulb._id), "year": ObjectId(year._id) }
        let annualAccountData = await AnnualAccountData.findOne(query);

        if (annualAccountData && annualAccountData.isCompleted && annualAccountData.status === 'PENDING') {
            return res.status(400).json({
                success: false,
                message: 'Data Already Submitted for ' + user.name + '. You can re-submit the data after Action is taken by State Govt and MoHUA'
            })
        }


        if (annualAccountData && annualAccountData.isCompleted && annualAccountData.status != 'PENDING') {
            req.body['history'] = [...annualAccountData.history];
            annualAccountData.history = undefined;
            req.body['history'].push(annualAccountData);
            data['status'] = 'PENDING';
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
            data['status'] = 'PENDING';
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


module.exports.action = catchAsync(async (req, res, next) => {

    let user = req.decoded;
    (data = req.body), (_id = ObjectId(req.params._id));

    let prevState = await AnnualAccountData.findOne(
        { _id: _id },
        '-history'
    ).lean();
    let accountYear = await Year.findOne({ _id: ObjectId(prevState.year) })
    console.log(accountYear)
    if (accountYear.year != '2019-20') {
        delete data.provisional_data.auditor_report;
    }

    let prevUser = await User.findOne({
        _id: ObjectId(prevState.actionTakenBy),
    }).exec();

    if (prevState.status == 'APPROVED' && prevUser.role == 'MoHUA') {
        return Response.BadRequest(
            res,
            {},
            'Already approved By MoHUA User.'
        );
    }
    if (prevState.status == 'REJECTED' && prevUser.role == 'MoHUA') {
        return Response.BadRequest(
            res,
            {},
            'Already Rejected By MoHUA User.'
        );
    }
    if (
        prevState.status == 'APPROVED' &&
        user.role == 'STATE' &&
        prevUser.role == 'STATE'
    ) {
        return Response.BadRequest(
            res,
            {},
            'Already approved By STATE User.'
        );
    }
    if (
        prevState.status == 'REJECTED' &&
        user.role == 'STATE' &&
        prevUser.role == 'STATE'
    ) {
        return Response.BadRequest(
            res,
            {},
            'Already Rejected By State User.'
        );
    }
    let flag = overAllStatus(data);

    flag.then(
        async (value) => {
            data['status'] = value.status ? 'REJECTED' : 'APPROVED';
            if (!data['isCompleted']) {
                data['status'] = 'PENDING';
            }
            let actionAllowed = ['MoHUA', 'STATE'];
            if (actionAllowed.indexOf(user.role) > -1) {
                if (user.role == 'STATE') {
                    let ulb = await Ulb.findOne({
                        _id: ObjectId(data.ulb),
                    }).exec();

                    if (
                        !(
                            ulb &&
                            ulb.state &&
                            ulb.state.toString() == user.state
                        )
                    ) {
                        let message = !ulb
                            ? 'Ulb not found.'
                            : 'State is not matching.';
                        return Response.BadRequest(res, {}, message);
                    }
                }
                let history = Object.assign({}, prevState);
                if (!prevState) {
                    return Response.BadRequest(
                        res,
                        {},
                        'Requested record not found.'
                    );
                }
                data['actionTakenBy'] = user._id;
                data['ulb'] = prevState.ulb;
                data['modifiedAt'] = time();
                let design_year = await Year.findOne({ "year": data.design_year })
                data['design_year'] = design_year._id;

                let du = await AnnualAccountData.updateOne(
                    { _id: ObjectId(prevState._id) },
                    { $set: data, $push: { history: history } }
                );

                let annualAccountDataobj = await AnnualAccountData.findOne({
                    _id: ObjectId(prevState._id),
                }).exec();
                console.log(annualAccountDataobj)
                let ulbUser = await User.findOne({
                    ulb: ObjectId(annualAccountDataobj.ulb),
                    isDeleted: false,
                    role: 'ULB',
                })
                    .populate([
                        {
                            path: 'state',
                            model: State,
                            select: '_id name',
                        },
                    ])
                    .exec();


                //send Mail
                return Response.OK(res, annualAccountDataobj, ``);
            } else {
                return Response.BadRequest(
                    res,
                    {},
                    `This action is only allowed by ${actionAllowed.join()}`
                );
            }
        },
        (rejectError) => {
            return Response.BadRequest(res, {}, rejectError);
        }
    ).catch((caughtError) => {
        console.log('final caughtError', caughtError);
    });

})


function overAllStatus(data) {


    return new Promise((resolve, reject) => {
        let rejected = false;
        let rejectReason = [];
        let rejectDataSet = [];

        for (key in data) {
            if (typeof data[key] === 'object' && data[key] !== null) {
                if (key == 'provisional_data') {
                    for (let objKey of provisional_dataKeys) {
                        if (
                            data[key][objKey] &&
                            data[key][objKey]['status'] == 'REJECTED'
                        ) {
                            if (
                                !data[key][objKey]['rejectReason'] &&
                                data['isCompleted']
                            ) {
                                reject('reject reason is missing');
                            }
                            rejected = true;
                            let tab =
                                'Service Level Indicators:' +
                                mappingKeys[objKey];
                            let reason = {
                                [tab]: data[key][objKey]['rejectReason'],
                            };
                            rejectReason.push(reason);
                        }
                    }
                    // for(let d of data[key]["documents"]["wasteWaterPlan"]){
                    //     if(d.status=='REJECTED'){
                    //         rejected=true;
                    //         let tab = "Water Supply & Waste-Water Management:Upload Documents"
                    //         if(!d.rejectReason){
                    //             reject('reject reason is missing')
                    //         }
                    //         let reason = {
                    //             [tab]:d.rejectReason
                    //         }
                    //         rejectReason.push(reason)
                    //     }
                    // }
                }
            } else {
                if (data['status'] == 'REJECTED') {
                    rejected = true;
                }
            }
        }
        /** Concat reject reason string */

        if (rejectReason.length > 0) {
            let finalString = rejectReason.map((obj) => {
                let service = Object.keys(obj)[0];
                let reason = obj[service];
                let s = service.split(':');
                let arr = [...s, reason];
                return arr;
                // service = `<strong>` + service + `</strong>`;
                //return `<p> ${service + ` :` + reason} </p>`;
            });
            let x = `<table border='1'>
            <tr>
                <th>Tab Name</th>
                <th>Field Name</th>
                <th>Reason for Rejection</th>
            </tr>
            `;
            for (i of finalString) {
                x += `<tr>`;
                for (t of i) {
                    x += `<td>${t}</td>`;
                }
                x += `</tr>`;
            }
            x += `</table>`;
            resolve({ status: rejected, reason: x });
        }
        resolve({ status: rejected, reason: '' });
    });
}

