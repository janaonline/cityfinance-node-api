const LedgerLogModel = require('../../models/LedgerLog');
const UlbLedger = require('../../models/UlbLedger');
const mongoose = require("mongoose");
const moment = require("moment");
const ObjectId = require('mongoose').Types.ObjectId;
const Ulb = require('../../models/Ulb');
const RequestLog = require('../../models/RequestLog')
const DataCollectionForms = require('../../models/DataCollectionForm')
const util = require('util')
// Get Income expenditure report
module.exports.getIE = function (req, res) {

    if (!req.body.ulbList || req.body.ulbList.length == 0 || req.body.ulbIds.length == 0) {
        res.json({
            success: false,
            msg: 'Invalid payload',
            data: "ULB List is empty"
        });
        return;
    }

    ulbCodeArr = [];
    for (i = 0; i < req.body.ulbList.length; i++) {
        if (req.body.ulbList[i].code) {
            // Get all the ulb codes, for whose balance sheet has been requested
            ulbCodeArr.push(req.body.ulbList[i].code);
        }
    }

    let payload = {};
    payload['head_of_account'] = { $match: { "lineitems.headOfAccount": { $in: ['Revenue', 'Expense'] } } };
    payload['ulb_code'] = { $match: { "ulbs.code": { $in: ulbCodeArr } } };

    // For all the ulb codes, ulb its will also be there
    let ulbIds = req.body.ulbIds ? req.body.ulbIds.map(m => mongoose.Types.ObjectId(m)) : "NA";

    var aggregateCondition = condition(ulbIds);

    // using both, ulb codes and ulb ids for filtering data from ledger collection
    aggregateCondition.splice(3, 0, payload['ulb_code'], payload['head_of_account']);

    UlbLedger.aggregate(aggregateCondition).exec((err, result) => {
        if (err) {
            return res.json({
                success: false,
                msg: 'Invalid payload',
                data: err.toString()
            });
        }
        return res.json({
            success: true,
            msg: 'success',
            data: result,
        });
    })
}

// Get Balance sheet report
module.exports.getBS = function (req, res) {

    if (!req.body.ulbList || req.body.ulbList.length == 0 || req.body.ulbIds.length == 0) {
        res.json({
            success: false,
            msg: 'Invalid payload',
            data: "ULB List is empty"
        });
        return;
    }

    ulbCodeArr = [];
    for (i = 0; i < req.body.ulbList.length; i++) {
        if (req.body.ulbList[i].code) {
            // Get all the ulb codes, for whose balance sheet has been requested
            ulbCodeArr.push(req.body.ulbList[i].code);
        }
    }

    let payload = {};
    payload['head_of_account'] = { $match: { "lineitems.headOfAccount": { $in: ['Asset', 'Liability'] } } };
    payload['ulb_code'] = { $match: { "ulbs.code": { $in: ulbCodeArr } } };

    // For all the ulb codes, ulb its will also be there
    let ulbIds = req.body.ulbIds ? req.body.ulbIds.map(m => mongoose.Types.ObjectId(m)) : "NA";

    var aggregateCondition = condition(ulbIds);
    // make aggregate condition to find out ledgers which will be included in balance sheet
    // using both, ulb codes and ulb ids for filtering data from ledger collection
    aggregateCondition.splice(3, 0, payload['ulb_code'], payload['head_of_account']);

    UlbLedger.aggregate(aggregateCondition).exec(function (err, result) {
        if (err) {
            return res.json({
                success: false,
                msg: 'Invalid payload',
                data: err.toString()
            });
        }
        return res.json({
            success: true,
            msg: 'success',
            data: result,
        });
    })
}

module.exports.getAll = (req, res) => {

}
// Get all ledgers
module.exports.getAllLegders = async function (req, res) {
    let year = req.body.year ? (req.body.year.length ? req.body.year : null) : null;
    let ulb = req.body.ulb ? (req.body.ulb.length ? req.body.ulb : null) : null;
    let condition = { isActive: true };
    year ? condition["financialYear"] = { $all: year } : null;
    ulb = ulb ? ulb.map(x => ObjectId(x)) : null;
    ulb ? condition["ulb"] = { $in: ulb } : null;
    let ulbMatch = {}
    if (ulb) {
        ulbMatch = { 'ulb._id': condition["ulb"] }
    }

    if (!year) {
        // if year is empty, then take all the ledgers from the database irrespective of any year filter
        UlbLedger.aggregate([
            { $match: condition },
            {
                $group: {
                    _id: {
                        ulb: "$ulb",
                        financialYear: "$financialYear"
                    },
                    amount: { $sum: "$amount" }
                }
            },
            {
                $lookup: {
                    from: "ulbs",
                    as: "ulbs",
                    foreignField: "_id",
                    localField: "_id.ulb"
                }
            },
            {
                $lookup: {
                    from: "states",
                    as: "states",
                    foreignField: "_id",
                    localField: "ulbs.state"
                }
            },
            {
                $lookup: {
                    from: "ulbtypes",
                    as: "ulbtypes",
                    foreignField: "_id",
                    localField: "ulbs.ulbType"
                }
            },
            {
                $project: {
                    "ulbs": { $arrayElemAt: ["$ulbs", 0] },
                    "states": { $arrayElemAt: ["$states", 0] },
                    "ulbtypes": { $arrayElemAt: ["$ulbtypes", 0] },
                    financialYear: "$_id.financialYear",
                    amount: 1
                }
            },
            {
                $project: {
                    _id: 0,
                    ulb: { $cond: ["$ulbs", "$ulbs", "NA"] },
                    state: { $cond: ["$states", "$states", "NA"] },
                    ulbtypes: { $cond: ["$ulbtypes", "$ulbtypes", "NA"] },
                    financialYear: 1,
                    amount: 1
                }
            },
            { $match: ulbMatch }
        ]).exec((err, out) => {
            if (err) {
                res.json({
                    success: false,
                    msg: 'Invalid Payload',
                    data: err.toString()
                });
            }
            res.json({
                success: true,
                msg: 'Success',
                data: out
            });
        });

    } else {
        // if year is present, then take all the ledgers from the database of year filter
        UlbLedger.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: {
                        ulb: "$ulb",
                    },
                    population: { $first: "$population" },
                    financialYear: { $addToSet: "$financialYear" },
                }
            },
            {
                $match: {
                    financialYear: condition["financialYear"]
                }
            },
            {
                $lookup: {
                    from: "ulbs",
                    as: "ulbs",
                    foreignField: "_id",
                    localField: "_id.ulb"
                }
            },
            {
                $lookup: {
                    from: "states",
                    as: "states",
                    foreignField: "_id",
                    localField: "ulbs.state"
                }
            },
            {
                $lookup: {
                    from: "ulbtypes",
                    as: "ulbtypes",
                    foreignField: "_id",
                    localField: "ulbs.ulbType"
                }
            },
            {
                $project: {
                    "ulbs": { $arrayElemAt: ["$ulbs", 0] },
                    "states": { $arrayElemAt: ["$states", 0] },
                    "ulbtypes": { $arrayElemAt: ["$ulbtypes", 0] },
                    financialYear: "$_id.financialYear",
                    amount: 1,
                    population: 1
                }
            },
            {
                $project: {
                    _id: 0,
                    ulb: { $cond: ["$ulbs", "$ulbs", "NA"] },
                    state: { $cond: ["$states", "$states", "NA"] },
                    ulbtypes: { $cond: ["$ulbtypes", "$ulbtypes", "NA"] },
                    financialYear: 1,
                    amount: 1,
                    population: 1
                }
            },
            { $match: ulbMatch },
            { $match: { amount: { $ne: 0 } } }
        ]).exec((err, out) => {
            if (err) {
                res.json({
                    success: false,
                    msg: 'Invalid Payload',
                    data: err.toString()
                });
            }
            res.json({
                success: true,
                msg: 'Success',
                data: out
            });
        });

    }
};

module.exports.getAllUlbLegders = async function (req, res) {

    Ulb.aggregate([
        { $match: { isActive: true } },
        {
            $lookup:
            {
                from: 'ulbledgers',
                localField: '_id',
                foreignField: 'ulb',
                as: 'ulbledger',
            }
        },
        {
            $lookup: {
                from: 'states',
                localField: 'state',
                foreignField: '_id',
                as: 'state',
            }
        },
        {
            $lookup: {
                from: 'ulbtypes',
                localField: 'ulbType',
                foreignField: '_id',
                as: 'ulbType',
            }
        },
        { $unwind: { path: '$ulbledger', preserveNullAndEmptyArrays: true } },
        { $unwind: '$state' },
        { $unwind: '$ulbType' },
        {
            $group: {
                _id: {
                    ulb: "$_id",
                    name: "$name",

                    financialYear: {
                        $cond: {
                            if: '$ulbledger.financialYear',
                            then: '$ulbledger.financialYear',
                            else: 'NA'
                        }
                    },
                },
                state: { "$first": "$state" },
                code: { "$first": "$code" },
                ulbType: { "$first": "$ulbType.name" },
                population: { "$first": "$population" }
            }
        },
        {
            $group: {
                _id: {
                    ulb: "$_id.ulb",
                    name: "$_id.name"
                },
                financialYear: {
                    $push: {
                        $cond: [
                            { $eq: ["$_id.financialYear", 'NA'] },
                            null,
                            "$_id.financialYear"
                        ]
                    }
                },
                state: { "$first": "$state" },
                code: { "$first": "$code" },
                ulbType: { "$first": "$ulbType" },
                population: { "$first": "$population" }

            }
        },
        {
            $group: {
                _id: {
                    state: "$state._id",
                    name: "$state.name"
                },
                ulbList: { $push: { population: "$population", ulbType: "$ulbType", code: "$code", financialYear: "$financialYear", ulb: "$_id.ulb", name: "$_id.name" } }
            }
        }
    ]).exec((err, out) => {
        if (err) {
            res.json({
                success: false,
                msg: 'Invalid Payload',
                data: err.toString()
            });
        }
        res.json({
            success: true,
            msg: 'Success',
            data: out
        });
    });

}
// Get all ledgers present in database in CSV Format
module.exports.getAllLedgersCsv = function (req, res) {
    let filename = "All Ledgers " + (moment().format("DD-MMM-YY HH:MM:SS")) + ".csv";

    // Set approrpiate download headers
    res.setHeader("Content-disposition", "attachment; filename=" + filename);
    res.writeHead(200, { "Content-Type": "text/csv;charset=utf-8,%EF%BB%BF" });
    res.write("ULB Name, ULB Code, AMRUT, Head of account,Code, Line Item, Budget year, Budget amount\r\n");
    // Flush the headers before we start pushing the CSV content
    res.flushHeaders();

    const cursor = UlbLedger.aggregate([
        {
            $lookup: {
                from: "ulbs",
                as: "ulbs",
                foreignField: "_id",
                localField: "ulb"
            }
        },
        {
            $lookup: {
                from: "lineitems",
                as: "lineitems",
                foreignField: "_id",
                localField: "lineItem"
            }
        },
        {
            $lookup: {
                from: "states",
                as: "states",
                foreignField: "_id",
                localField: "ulbs.state"
            }
        },
        {
            $lookup: {
                from: "ulbtypes",
                as: "ulbtypes",
                foreignField: "_id",
                localField: "ulbs.ulbType"
            }
        },
        {
            $project: {
                "ulbs": { $arrayElemAt: ["$ulbs", 0] },
                "states": { $arrayElemAt: ["$states", 0] },
                "ulbtypes": { $arrayElemAt: ["$ulbtypes", 0] },
                "lineitems": { $arrayElemAt: ["$lineitems", 0] },
                financialYear: "$financialYear",
                amount: 1,
                population: 1
            }
        },
        {
            $project: {
                _id: 0,
                ulb: { $cond: ["$ulbs", "$ulbs", "NA"] },
                state: { $cond: ["$states", "$states", "NA"] },
                ulbtypes: { $cond: ["$ulbtypes", "$ulbtypes", "NA"] },
                line_item: { $cond: ["$lineitems", "$lineitems", "NA"] },
                financialYear: 1,
                amount: 1,
                population: 1
            }
        }
    ]).cursor({ batchSize: 500 }).exec()
    cursor.on("data", function (el) {
        if (el.ulb != 'NA') {
            let line_item = el.line_item ? el.line_item.name.toString().replace(/[,]/g, ' | ') : "";
            el.code = el.line_item ? el.line_item.code : "";
            el.head_of_account = el.line_item ? el.line_item.headOfAccount : "";
            el.ulb.name = el.ulb ? el.ulb.name.toString().replace(/[,]/g, ' | ') : "";
            res.write(el.ulb.name + "," + el.ulb.code + "," + el.ulb.amrut + "," + el.head_of_account + "," + el.code + "," + line_item + "," + el.financialYear + "," + el.amount + "\r\n");
        }
    })
    cursor.on("end", function (el) {
        res.end()
    })
}
//@LedgerLog
module.exports.getAllLogs = function (req, res) {
    LedgerLogModel.find({}, (err, out) => {
        if (err) {
            res.json({ success: false, msg: 'Invalid Payload', data: err.toString() });
        }
        res.json({ success: true, msg: 'Success', data: out });
    })
};
module.exports.addLog = function (req, res) {
    let newLog = new LedgerLogModel({
        particular: req.body.particular,
        mobile: req.body.mobile,
        email: req.body.email,
        isUserExist: req.body.isUserExist
    });
    newLog.save(newLog, (err, user) => {
        if (err) {
            res.json({ success: false, msg: 'Failed to log' });
        } else {
            res.json({ success: true, msg: 'Log registered' })
        }
    });
};

module.exports.report =  async (req, res) => {
    let { fy } = req.query
    // let FY = fy;
    let filename = "Report_20" + `${fy}` + ".csv";

    // Set approrpiate download headers
    res.setHeader("Content-disposition", "attachment; filename=" + filename);
    res.writeHead(200, { "Content-Type": "text/csv;charset=utf-8,%EF%BB%BF" });
    res.write(
        "ULB_Name, Code, Standardized_Excel_Uploaded, PDF_NAME, PDF_URL, EXCEL_NAME, EXCEL_URL  \r\n"
    );
    // Flush the headers before we start pushing the CSV content

    let query_datacollectionform = [
        {
            $lookup: {
                from: "ulbs",
                localField: "ulb",
                foreignField: "_id",
                as: "ulb"
            }
        },
        { $unwind: "$ulb" },
        {
            $project: {
                "15-16": "$documents.financial_year_2015_16",
                "16-17": "$documents.financial_year_2016_17",
                "17-18": "$documents.financial_year_2017_18",
                "18-19": "$documents.financial_year_2018_19",
                "ulb": "$ulb.name",
                "code": "$ulb.code"
            }
        },

        {
            $project: {
                "15-16_pdf": "$15-16.pdf",
                "16-17_pdf": "$16-17.pdf",
                "17-18_pdf": "$17-18.pdf",
                "18-19_pdf": "$18-19.pdf",
                "15-16_excel": "$15-16.excel",
                "16-17_excel": "$16-17.excel",
                "17-18_excel": "$17-18.excel",
                "18-19_excel": "$18-19.excel",
                "ulb": 1,
                "code": 1
            }
        },
        {
            $unwind: `$${fy}_pdf`
        },
        {
            $unwind: {
                path: `$${fy}_excel`,
                preserveNullAndEmptyArrays: true
            }
        },


        {
            $group: {
                "_id": "$ulb",
                fileUrlpdf: { $last: `$${fy}_pdf.url` },
                fileNamepdf: { $last: `$${fy}_pdf.name` },
                fileUrlexcel: { $last: `$${fy}_excel.url` },
                fileNameexcel: { $last: `$${fy}_excel.name` },
                code: { $first: "$code" }
            }
        },
        {
            $lookup: {
               from: "ledgerlogs",
               let: {
                  firstUser: `20${fy}`,
                  secondUser: "$code"
               },
               pipeline: [
                  {
                     $match: {
                        $expr: {
                           $and: [
                              {
                                 $eq: [
                                    "$year",
                                    "$$firstUser"
                                 ]
                              },
                              {
                                 $eq: [
                                    "$ulb_code",
                                    "$$secondUser"
                                 ]
                              }
                           ]
                        }
                     }
                  }
               ],
               as: "ledgerlogs"
            }
         },
        {
            $unwind: {
                path: "$ledgerlogs",
                preserveNullAndEmptyArrays: true
            },

        },

        {
            $project: {
                fileUrlpdf: 1,
                fileNamepdf: 1,
                fileUrlexcel: 1,
                fileNameexcel: 1,
                code: 1,
                logCreated: { $ifNull: ["$ledgerlogs", "No"] }
            }
        },

        {
            $project: {
                fileUrlpdf: 1,
                fileNamepdf: 1,
                fileUrlexcel: 1,
                fileNameexcel: 1,
                code: 1,
                logcreated: {
                    $cond: {
                        if: { $eq: ["$logCreated", "No"] },
                        then: "No",
                        else: "Yes",
                    },
                },
            }

        },

    ]
    let FY = fy.replace('-', '_')
    let ledgerData;
    let query_ledgerLog = [

        {
            $match:{
                year:`20${fy}`
                }
            }
        ,
        {
            $lookup:{
                from:"ulbs",
                localField:"ulb_code",
                foreignField:"code",
                as:"ulb"
                }
            },
            {
                $unwind:"$ulb"
                },
                
                
                {
                    $lookup:{
                        from:"datacollectionforms",
                        localField:"ulb._id",
                        foreignField:"ulb",
                        as:"datacollectionform"
                        }
                    },
                    {
                        $unwind:{
                            path:"$datacollectionform",
                            preserveNullAndEmptyArrays: true
                            }
                        },
                        
                        {
                            $project:{
                                year:1,
                                ulb_code:1,
                                audit_status:1,
                                ulbName:"$ulb.name",
                                standardized_excel:"$excel_url",
                                rawPDF: {$ifNull:[`$datacollectionform.documents.financial_year_20${FY}.pdf`,[]]},
                                rawExcel:{$ifNull:[`$datacollectionform.documents.financial_year_20${FY}.excel`,[]]},
                             
                                }
                            },
             
                            
                            {
                                $group:{
                                    _id:{
                                        year:"$year",
                                        ulb_code:"$ulb_code"
                                        },
                                rawPDF: {$last:"$rawPDF"},
                                rawExcel: {$last:"$rawExcel"},
                                standardized_excelStatus: {$first:"Yes"},
                                ulbName: {$first:"$ulbName"},           
                                    }
                                },
                                {
                                    $project:{
ulbName:1,
standardized_excelStatus: 1,
rawExcel:{$ifNull:[{$arrayElemAt:["$rawExcel",0]}, ""]},
rawPDF:{$ifNull:[{$arrayElemAt:["$rawPDF",0]}, ""]}

                                    }
                                },
                                {
                                    $project:{
                                
ulbName:1,
standardized_excelStatus: 1,
rawExcel_name:{$ifNull:["$rawExcel.name",  null]},
rawExcel_url:{$ifNull:["$rawExcel.url",null]},
rawPDF_name:{$ifNull:["$rawPDF.name",null]},
rawPDF_url:{$ifNull:["$rawPDF.url",null]}

                                    
                                    
                                    }
                        
                                    }
                                
                        
        ]
    ledgerData =  await  LedgerLogModel.aggregate(query_ledgerLog)
    console.log(util.inspect(query_ledgerLog, {showHidden: false, depth:  null}))
    DataCollectionForms.aggregate(query_datacollectionform).exec((err, data) => {
        if (err) {
            res.json({
                success: false,
                msg: "Invalid Payload",
                data: err.toString(),
            });
        } else {
            res.flushHeaders();
            for (let el of data) {
                if(el.logcreated == 'No'){
                    res.write(
                        el._id +
                        "," +
                        el.code +
                        "," +
                        el.logcreated +
                        "," +
                        el.fileNamepdf +
                        "," +
                        el.fileUrlpdf +
                        "," +
                        el.fileNameexcel +
                        "," +
                        el.fileUrlexcel +
                        "\r\n"
                    );
                }
           
            }
            // res.flushHeaders();
            console.log(ledgerData[0])
            for(let el of ledgerData){
// console.log(el?.ulbName,el?._id?.ulb_code,el?.standardized_excelStatus )
                       res.write(
                    el?.ulbName +
                    "," +
                    el?._id?.ulb_code +
                    "," +
                    el?.standardized_excelStatus +
                    "," +
                    el.rawPDF_name +
                    "," +
                     el.rawPDF_url  +
                    "," +
                    el.rawExcel_name +
                    "," +
                    el.rawExcel_url +
                    "\r\n"
                );
            }
            console.log(ledgerData.length, '+', data.length )
            res.end();
        }
    });



}

module.exports.getRequestLog = async function (req, res) {
    let req_Id = req.query.reqId
    let data;
    if (req_Id) {
        data = await RequestLog.findOne({ _id: ObjectId(req_Id) })
    } else {
        data = await RequestLog.find({})
    }

    return res.json({
        success: true,
        data: data,
        total: req_Id ? 1 : data.length
    })
}

function condition(ulbs) {
    return [
        { $match: { ulb: { $in: ulbs } } },
        {
            $lookup: {
                from: "ulbs",
                as: "ulbs",
                foreignField: "_id",
                localField: "ulb"
            }
        },
        {
            $lookup: {
                from: "lineitems",
                as: "lineitems",
                foreignField: "_id",
                localField: "lineItem"
            }
        },
        {
            $project: {
                "ulbs": { $arrayElemAt: ["$ulbs", 0] },
                amount: 1,
                financialYear: 1,
                "lineitems": { $arrayElemAt: ["$lineitems", 0] },
            }
        },
        {
            $project: {
                _id: 1,
                ulbs: { $cond: ["$ulbs", "$ulbs", "NA"] },
                amount: 1,
                financialYear: 1,
                "lineitems": { $cond: ["$lineitems", "$lineitems", "NA"] },
            }
        },
        {
            $group: {
                _id: {
                    "lineItem": "$lineitems.code",
                    "ulb": "$ulbs.code",
                },
                budget: { $push: { amount: "$amount", "year": "$financialYear" } },
                ulb_code: { $first: "$ulbs.code" },
                line_item: { $first: "$lineitems.name" },
                code: { $first: "$lineitems.code" },
                head_of_account: { $first: "$lineitems.headOfAccount" },
                population: { $first: "$ulbs.population" }
            }
        },
        {
            $project: {
                _id: 0,
                head_of_account: 1,
                code: 1,
                ulb_code: 1,
                line_item: 1,
                budget: 1,
                population: 1
            }
        }]
}