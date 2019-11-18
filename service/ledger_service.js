const ledgerLogModel = require('../models/Schema/UlbLedger');
const ledgerModel = require('../models/Schema/UlbLedger');
const CONSTANTS = require('../_helper/constants');
const _helper = require('../_helper/ledger_helper');
var multer = require('multer');
var xlstojson = require("xls-to-json-lc");
var xlsxtojson = require("xlsx-to-json-lc");

module.exports.entry = function (req, res) {

    var exceltojson;
    upload(req, res, function (err) {
        if (err) {
            res.json({
                success: false,
                msg: 'Invalid Payload',
                data: err
            });
            return;
        }
        /** Multer gives us file info in req.file object */
        if (!req.file) {
            res.json({
                success: false,
                msg: 'File not found',
                data: err
            });
            return;
        }
        /** Check the extension of the incoming file and use the appropriate module */
        if (req.file.originalname.split('.')[req.file.originalname.split('.').length - 1] === 'xlsx') {
            exceltojson = xlsxtojson;
        } else {
            exceltojson = xlstojson;
        }

        try {
            exceltojson({
                input: req.file.path,
                output: null, //since we don't need output.json
                lowerCaseHeaders: true,
                sheet: CONSTANTS.LEDGER.BULK_ENTRY.OVERVIEW_SHEET_NAME,
            }, function (err, ledgerLogPayload) {
                const payload = new ledgerLogModel({
                    year: req.body.year,
                    state_code: req.body.stateCode,
                    state: req.body.stateName,
                    ulb: req.body.ulbName,
                    ulb_code: req.body.ulbCode,
                    ulb_code_year: req.body.ulbCode + '_' + req.body.year,
                    wards: req.body.wards,
                    area: req.body.area.replace(/\D/g, ''),
                    population: req.body.population,
                });
                const ledgerKeys = {
                    'State Code': 'state_code',
                    'ULB Code': 'ulb_code',
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
                }
                const k = Object.keys(ledgerKeys);
                for (var i = 0; i < ledgerLogPayload.length; i++) {
                    if(['state_code', 'ulb_code', 'year'].indexOf(ledgerKeys[ledgerLogPayload[i]['basic details']]) > -1 ){
                        if (ledgerLogPayload[i]['value'] != payload[ledgerKeys[ledgerLogPayload[i]['basic details']]]) {
                            res.json({
                                success: false,
                                msg: 'Data mismatch : ' + ledgerLogPayload[i]['basic details'],
                                data: ledgerLogPayload[i]['value']
                            });
                            return;
                        }
                    } else if (k.indexOf(ledgerLogPayload[i]['basic details']) > -1) {
                        payload[ledgerKeys[ledgerLogPayload[i]['basic details']]] = ledgerLogPayload[i]['value'];
                    }
                }
                // payload.year = payload.year ? payload.year.replace(/\D/g, '') : payload.year;
                // console.log(payload);

                ledgerLogModel.create(payload, (err, newLedgerLog) => {
                    if (err) {
                        if(err.code == 11000){
                            res.json({
                                success: false,
                                msg: 'Duplicate entry',
                                data: err.toString()
                            });
                        }else{
                            res.json({
                                success: false,
                                msg: 'Invalid payload',
                                data: err.toString()
                            });
                        }
                        return; 
                    } else {

                        try {
                            exceltojson({
                                input: req.file.path,
                                output: null, //since we don't need output.json
                                lowerCaseHeaders: true,
                                sheet: CONSTANTS.LEDGER.BULK_ENTRY.INPUT_SHEET_NAME,
                            }, function (err, arr) {
                                if (err) {
                                    return res.json({
                                        success: false,
                                        msg: 'Parsing error',
                                        data: err.toString()
                                    });
                                }
                                ledgerModel.getAll({
                                    'ulb_code': req.body.ulbCode
                                }, (err, ledgerArr) => {
                                    // for(var i = 0; i<ledgers.length; i++){
                                    var validEntry = [];
                                    var invalidEntry = [];
                                    bulk = ledgerModel.collection.initializeUnorderedBulkOp({
                                        useLegacyOps: true
                                    });
                                    bulkUpload = ledgerModel.collection.initializeUnorderedBulkOp({
                                        useLegacyOps: true
                                    });

                                    var insertFlag = true;
                                    arr.forEach(row => {
                                        insertFlag = true;
                                        var amountInInr = row['amount in inr'];
                                        if(amountInInr.indexOf('-')>-1 || (amountInInr.indexOf('(')>-1 && amountInInr.indexOf(')')>-1)){
                                            amountInInr = '-' + amountInInr.replace(/\D/g, '');
                                        } else{
                                            amountInInr = amountInInr.replace(/\D/g, '');
                                        }
                                        for (var i = 0; i < ledgerArr.length; i++) {
                                            if (ledgerArr[i]['code'].toString() == row['code']) {
                                                ledgerArr[i]['budget'].push({
                                                    'year': newLedgerLog.year,
                                                    'amount': amountInInr
                                                });

                                                bulkUpload.find({'code': row['code'], 'ulb_code': newLedgerLog.ulb_code})
                                                    .update({ 
                                                        $set: { budget: ledgerArr[i]['budget'] }
                                                    });
                                           
                                                insertFlag = false;
                                            }
                                        }
                                        if (!insertFlag) {
                                            return false;
                                        }
                                        if (!row['head of account'] && !row['code'] && !row['line item'] && !row['amount in inr']) {
                                            return false;
                                        } else if (!row['head of account'] || !row['code'] || !row['line item'] || !row['amount in inr']) {
                                            invalidEntry.push(row);
                                        } else if (row['head of account'] && row['code'] && row['line item'] && row['amount in inr']) {
                                            
                                            validEntry.push({'ulb_code': newLedgerLog.ulb_code,
                                                'head_of_account': row['head of account'],
                                                'code': row['code'],
                                                'groupCode': '',
                                                'line_item': row['line item'],
                                                'budget': [{
                                                    'year': newLedgerLog.year,
                                                    'amount': amountInInr
                                                }]
                                            });
                                        }

                                    });
                                    if (bulkUpload.length > 0) {
                                        bulkUpload.execute((err1, res1) => {
                                            console.log(err1, res1);
                                            res.json({
                                                success: true,
                                                msg: 'Success',
                                                data: {
                                                    'valid': validEntry,
                                                    'invalid': invalidEntry
                                                }
                                            });
                                        })
                                    } else if (validEntry.length > 0) {
                                        ledgerModel.bulkInsert(validEntry, (err, out) => {
                                            if (bulkUpload.length > 0) {
                                                bulkUpload.execute((err1, res1) => {
                                                    res.json({
                                                        success: true,
                                                        msg: 'Success',
                                                        data: {
                                                            'valid': validEntry,
                                                            'invalid': invalidEntry
                                                        }
                                                    });
                                                })
                                            } else {
                                                res.json({
                                                    success: true,
                                                    msg: 'Success',
                                                    data: {
                                                        'valid': validEntry,
                                                        'invalid': invalidEntry
                                                    }
                                                });
                                            }
                                        })
                                    } else {
                                        res.json({
                                            success: true,
                                            msg: 'Success',
                                            data: {
                                                'valid': validEntry,
                                                'invalid': invalidEntry
                                            }
                                        });
                                    }
                                })
                            });
                        } catch (e) {
                            res.json({
                                success: false,
                                msg: 'Corupted excel file',
                                data: e.toString()
                            });
                        }
                    }
                });
            })
        } catch (e) {
            res.json({
                success: false,
                msg: 'Corupted excel file',
                data: e.toString()
            });
        }

    });

};

module.exports.getIE = function (req, res) {

    // if(!req.body.ulb || !req.body.ulb.code || req.body.ulb.length == 0){
    if(!req.body.ulbList || req.body.ulbList.length == 0){
        res.json({
            success: false,
            msg: 'Invalid payload',
            data: "ULB List is empty"
        });
        return;
    }

    ulbCodeArr = [];
    for(i=0; i<req.body.ulbList.length; i++){
        if(req.body.ulbList[i].code){
           ulbCodeArr.push(req.body.ulbList[i].code);
        }
    }
    let payload = {};
    payload['head_of_account'] = { $match:{ "lineitems.headOfAccount":{$in : ['Revenue','Expense']} } };
    payload['ulb_code']= { $match: { "ulbs.code":{$in : ulbCodeArr} } } ;
    var aggregateCondition = condition(); 
    aggregateCondition.splice(2, 0, payload['ulb_code'],payload['head_of_account']);
    ledgerModel.aggregate(aggregateCondition).exec((err, result) => {
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


module.exports.getBS = function (req, res) {
    if(!req.body.ulbList || req.body.ulbList.length == 0){
        res.json({
            success: false,
            msg: 'Invalid payload',
            data: "ULB List is empty"
        });
        return;
    }

    ulbCodeArr = [];
    for(i=0; i<req.body.ulbList.length; i++){
        if(req.body.ulbList[i].code){
           ulbCodeArr.push(req.body.ulbList[i].code);
        }
    }

    let payload = {};
    payload['head_of_account'] = { $match:{ "lineitems.headOfAccount":{$in : ['Asset','Liability']} } };
    payload['ulb_code']= { $match:{ "ulbs.code":{$in : ulbCodeArr} } } ;
    var aggregateCondition = condition(); 
    aggregateCondition.splice(2, 0, payload['ulb_code']);
    ledgerModel.aggregate(aggregateCondition).exec(function(err, result){
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

// update entry
module.exports.updateLedger = function (req, res) {
    ledgerModel.update({
        _id: req.params.entryId
    }, req.body.updateObj, (err, res) => {
        if (err) {
            res.json({
                success: false,
                msg: 'Invalid Payload',
                data: err.toString()
            });
        }
    });
};


module.exports.getAll = function (req, res) {
    ledgerLogModel.getAll({}, (err, out) => {
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
};

module.exports.getAllLegders = function (req, res) {
    ledgerModel.getAllLedgers({}, (err, out) => {
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
};


module.exports.getAggregate = function (req, res) {
    
    let ledgers = _helper.IE_STRUCTURE;
    if(req.body.reportGroup == "Balance Sheet"){
        ledgers = _helper.BS_STRUCTURE;
    }
   
    const years =req.body.years ;
    // const years = ["2015-16", "2016-17"];
    let counter = 0;
    for (let i = 0; i < years.length; i++) {
        const yr = years[i];
     
        ledgerModel.getAggregate({ulbList: req.body.ulbList, year: yr}, (err, output) => {
            if (err) {
                res.json({
                    success: false,
                    msg: 'Invalid Payload',
                    data: err.toString()
                });
            } else{
                
                var result = output.reduce(function(map, obj) {
                    map[obj._id] = obj.total;
                    return map;
                }, {});

                ledgers.forEach(ledger => {
                    ledger.budget.push({year: yr, amount: result[ledger.code]})
                })
                counter ++;
                if(counter == years.length){
                    res.json({
                        success: true,
                        msg: 'Success',
                        data: ledgers
                    });
                }
            }
        
        });

        
    }
};




var storage = multer.diskStorage({ //multers disk storage settings
    destination: function (req, file, cb) {
        cb(null, './uploads/')
    },
    filename: function (req, file, cb) {
        var datetimestamp = Date.now();
        cb(null, file.fieldname + '-' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length - 1])
    }
});

var upload = multer({ //multer settings
    storage: storage,
    fileFilter: function (req, file, callback) { //file filter
        if (['xls', 'xlsx'].indexOf(file.originalname.split('.')[file.originalname.split('.').length - 1]) === -1) {
            return callback(new Error('Wrong extension type'));
        }
        callback(null, true);
    }
}).single('file');


function condition(){
    return [{$lookup:{
        from:"ulbs",
        as:"ulbs",
        foreignField : "_id",
        localField:"ulb"
    }
    },
    {$lookup:{
        from:"lineitems",
        as:"lineitems",
        foreignField : "_id",
        localField:"lineItem"
    }
    },
    {$project:{
        "ulbs":{ $arrayElemAt  :  [ "$ulbs",0]},
        amount:1,
        financialYear:1,
        "lineitems":{ $arrayElemAt  :  [ "$lineitems",0]},
    }
    },
    {$project:{
        _id:1,
        ulbs : { $cond : ["$ulbs","$ulbs","NA"]},
        amount:1,
        financialYear:1,
       "lineitems": { $cond : ["$lineitems","$lineitems","NA"]},
    }
    },
    {$group:{
        _id:{
            "lineItem" : "$lineitems.code",
            "ulb" : "$ulbs.code",
        },
        budget:{$push:{ amount:"$amount","year" : "$financialYear" }} ,
        ulb_code:{$first:"$ulbs.code"},
        line_item:{$first:"$lineitems.name"},
        code:{$first:"$lineitems.code"},
        head_of_account:{$first:"$lineitems.headOfAccount"},
    }
    },
    {$project:{
        _id:0,
        head_of_account:1,
        code:1,
        ulb_code:1,
        line_item:1,
        budget:1
    }
    }]
}