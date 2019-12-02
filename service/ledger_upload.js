const ledgerLogModel = require('../models/ledger_log_model');
const ledgerModel = require('../models/ledger_model');
const lookupService = require('../service/lookup_service');
const CONSTANTS = require('../_helper/constants');
var multer = require('multer');
var xlstojson = require("xls-to-json-lc");
var xlsxtojson = require("xlsx-to-json-lc");

let uploadResult = [];
module.exports.bulkEntry = function (req, res) {

    uploadResult = [];
    for(index=0; index<req.files.length; index++){
        ledgerEntry(req.files[index], req.body.year);
    }
    var si = setInterval(function(){
        if(req.files.length == uploadResult.length){
            clearInterval(si);
            res.json({success: true, data: uploadResult});
        }
    }, 500);
};

var ledgerEntry = function(reqFile, financialYear){
    // let uploadResult = [];
    // for(index=0; index<req.files.length; index++){
        var exceltojson;
        if (reqFile.originalname.split('.')[reqFile.originalname.split('.').length - 1] === 'xlsx') {
            exceltojson = xlsxtojson;
        } else {
            exceltojson = xlstojson;
        }
        try {
            exceltojson({
                input: reqFile.path,
                output: null, //since we don't need output.json
                lowerCaseHeaders: true,
                sheet: CONSTANTS.LEDGER.BULK_ENTRY.OVERVIEW_SHEET_NAME,
            }, function (err, ledgerLogPayload) {

                if(ledgerLogPayload.length < 2){
                    uploadResult.push({ success: false, msg: 'Overview sheet not available : ' + reqFile.originalname, data: reqFile.originalname });
                    return;
                }

                const ledgerKeys = {
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
                }

                const payload = new ledgerLogModel({ });

                const k = Object.keys(ledgerKeys);
                for (var i = 0; i < ledgerLogPayload.length; i++) {
                    if (k.indexOf(ledgerLogPayload[i]['basic details']) > -1) {
                        payload[ledgerKeys[ledgerLogPayload[i]['basic details']]] = ledgerLogPayload[i]['value'];
                    }
                }
                payload['ulb_code_year'] = payload.ulb_code + '_' + payload.year;

                if(payload['year'] != financialYear){
                    uploadResult.push({ success: false, msg: 'Invalid finacial year for ULB : ' + payload['ulb_code_year'], data: financialYear });
                    return;
                }

                const ulbInfo = lookupService.getUlbInfo(payload.state_code, payload.ulb_code);
                if(!ulbInfo){
                    uploadResult.push({ success: false, msg: 'ULB info not available : ' + payload['ulb_code_year'], data: '' });
                    return;
                }
                payload['wards'] = ulbInfo.wards ? ulbInfo.wards : 0;
                payload['area'] = ulbInfo.area  ? ulbInfo.area : 0;
                payload['population'] = ulbInfo.population   ? ulbInfo.population : 0;
                
                try {
                    exceltojson({
                        input: reqFile.path,
                        output: null, //since we don't need output.json
                        lowerCaseHeaders: true,
                        sheet: CONSTANTS.LEDGER.BULK_ENTRY.INPUT_SHEET_NAME,
                    }, function (err, arr) {
                        if (err) {
                            uploadResult.push({ success: false, msg: 'Parsing error on ULB : ' + payload['ulb_code_year'], data: err.toString() });
                            // if(req.files.length == uploadResult.length){
                                // res.json({success: true, data: uploadResult});
                            // }
                        }
                        if(arr && arr.length > 0){
                            var inputSheetKeys = Object.keys(arr[0]);
                            if(inputSheetKeys.indexOf('head of account') == -1 || 
                                inputSheetKeys.indexOf('code') == -1 ||
                                inputSheetKeys.indexOf('line item') == -1 ||
                                inputSheetKeys.indexOf('amount in inr') == -1
                            ){
                                uploadResult.push({ success: false, msg: 'Incorrect input sheet format : ' + reqFile.originalname, data: '' });
                                return false;
                            }

                        }else {
                            uploadResult.push({ success: false, msg: 'Input sheet is empty : ' + reqFile.originalname, data: '' });
                            return false;
                        }
                        
                        
        

                                ledgerModel.getAll({
                                    'ulb_code': payload.ulb_code
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

                                    var bsLiability = 0;
                                    var bsAssets = 0;
                                    var bsCalc = {
                                        libAdd: ['310', '311', '312', '320', '330', '331', '340', '341', '350', '360', '300'],
                                        assetsAdd: ['410', '411', '412', '420', '421', '430', '431', '432', '440', '450', '460', '461', '470', '480', '400']
                                    }
                                    arr.forEach(row => {
                                        insertFlag = true;
                                        var tempAmount = row['amount in inr'] 
                                        
                                        if(!tempAmount || ! row['code']){
                                            invalidEntry.push(row);
                                            return false;
                                        } else if((tempAmount.indexOf('(')>-1 && tempAmount.indexOf(')')>-1)){
                                            tempAmount = "-" + tempAmount.replace("(", "").replace(")","");
                                        } else if( isNaN(parseFloat(tempAmount.replace(/,/g, '')))){
                                            if(tempAmount=="-"){
                                                tempAmount = "0";
                                            }else{
                                                invalidEntry.push(row);
                                                return false;
                                            }
                                        }

                                        var amountInInr = parseFloat(tempAmount.replace(/,/g, ''));

                                        if( bsCalc.libAdd.indexOf(row['code'].trim()) > -1 ){
                                            bsLiability = bsLiability + amountInInr;
                                        } else if( bsCalc.assetsAdd.indexOf(row['code'].trim()) > -1){
                                            bsAssets = bsAssets + amountInInr;
                                        }
                                        // if(amountInInr.indexOf('-')>-1 || (amountInInr.indexOf('(')>-1 && amountInInr.indexOf(')')>-1)){
                                        //     amountInInr = '-' + amountInInr.replace(/\D/g, '');
                                        // } else{
                                        //     amountInInr = amountInInr.replace(/\D/g, '');
                                        // }
                                        for (var i = 0; i < ledgerArr.length; i++) {
                                            if (ledgerArr[i]['code'].toString() == row['code']) {
                                                ledgerArr[i]['budget'].push({
                                                    'year': payload.year,
                                                    'amount': amountInInr
                                                });

                                                bulkUpload.find({'code': row['code'], 'ulb_code': payload.ulb_code})
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
                                            
                                            validEntry.push({'ulb_code': payload.ulb_code,
                                                'head_of_account': row['head of account'],
                                                'code': row['code'],
                                                'groupCode': '',
                                                'line_item': row['line item'],
                                                'budget': [{
                                                    'year': payload.year,
                                                    'amount': amountInInr
                                                }]
                                            });
                                        }

                                    });
                                   
                                    if(bsLiability != bsAssets){
                                        uploadResult.push({ success: false, msg: 'Balance Sheet not tallied : ' + payload['ulb_code_year'], data: {
                                            'valid': validEntry,
                                            'invalid': invalidEntry
                                        } });
                                    }
                                    else if (validEntry.length > 0) {
                                        ledgerModel.bulkInsert(validEntry, (err, out) => {
                                            if (bulkUpload.length > 0) {
                                                bulkUpload.execute((err1, res1) => {
                                                    if(err1){
                                                        return
                                                    }
                                                    ledgerLogModel.create(payload, (err, newLedgerLog) => {
                                                        if (err) {
                                                            if(err.code == 11000){
                                                                uploadResult.push({ success: false, msg: 'Duplicate entry for ULB : ' + payload['ulb_code_year'], data: err.toString() });
                                                                // if(req.files.length == uploadResult.length){
                                                                    // res.json({success: true, data: uploadResult});
                                                                // }
                                                            }else{
                                                                uploadResult.push({ success: false, msg: 'Invalid payload for ULB : ' + payload['ulb_code_year'], data: err.toString() });
                                                                // if(req.files.length == uploadResult.length){
                                                                    // res.json({success: true, data: uploadResult});
                                                                // }
                                                            }
                                                            return; 
                                                        } else {
                                                            // console.log(err1, res1);
                                                            uploadResult.push({ success: true, msg: 'Success on ULB : ' + payload['ulb_code_year'], data: {
                                                                'valid': validEntry,
                                                                'invalid': invalidEntry
                                                            } });
                                                        }
                                                    });
                                                    
                                                })
                                            } else {
                                                
                                                ledgerLogModel.create(payload, (err, newLedgerLog) => {
                                                    if (err) {
                                                        if(err.code == 11000){
                                                            uploadResult.push({ success: false, msg: 'Duplicate entry for ULB : ' + payload['ulb_code_year'], data: err.toString() });
                                                            // if(req.files.length == uploadResult.length){
                                                                // res.json({success: true, data: uploadResult});
                                                            // }
                                                        }else{
                                                            uploadResult.push({ success: false, msg: 'Invalid payload for ULB : ' + payload['ulb_code_year'], data: err.toString() });
                                                            // if(req.files.length == uploadResult.length){
                                                                // res.json({success: true, data: uploadResult});
                                                            // }
                                                        }
                                                        return; 
                                                    } else {
                                                        // console.log(err1, res1);
                                                        uploadResult.push({ success: true, msg: 'Success on ULB : ' + payload['ulb_code_year'], data: {
                                                            'valid': validEntry,
                                                            'invalid': invalidEntry
                                                        } });
                                                    }
                                                });
                                            }
                                        })
                                    } else if (bulkUpload.length > 0) {
                                        bulkUpload.execute((err1, res1) => {
                                            if(err1){
                                                return
                                            }
                                            ledgerLogModel.create(payload, (err, newLedgerLog) => {
                                                if (err) {
                                                    if(err.code == 11000){
                                                        uploadResult.push({ success: false, msg: 'Duplicate entry for ULB : ' + payload['ulb_code_year'], data: err.toString() });
                                                        // if(req.files.length == uploadResult.length){
                                                            // res.json({success: true, data: uploadResult});
                                                        // }
                                                    }else{
                                                        uploadResult.push({ success: false, msg: 'Invalid payload for ULB : ' + payload['ulb_code_year'], data: err.toString() });
                                                        // if(req.files.length == uploadResult.length){
                                                            // res.json({success: true, data: uploadResult});
                                                        // }
                                                    }
                                                    return; 
                                                } else {
                                                    // console.log(err1, res1);
                                                    uploadResult.push({ success: true, msg: 'Success on ULB : ' + payload['ulb_code_year'], data: {
                                                        'valid': validEntry,
                                                        'invalid': invalidEntry
                                                    } });
                                                }
                                            });
                                        })
                                    } else {
                                       
                                        ledgerLogModel.create(payload, (err, newLedgerLog) => {
                                            if (err) {
                                                if(err.code == 11000){
                                                    uploadResult.push({ success: false, msg: 'Duplicate entry for ULB : ' + payload['ulb_code_year'], data: err.toString() });
                                                    // if(req.files.length == uploadResult.length){
                                                        // res.json({success: true, data: uploadResult});
                                                    // }
                                                }else{
                                                    uploadResult.push({ success: false, msg: 'Invalid payload for ULB : ' + payload['ulb_code_year'], data: err.toString() });
                                                    // if(req.files.length == uploadResult.length){
                                                        // res.json({success: true, data: uploadResult});
                                                    // }
                                                }
                                                return; 
                                            } else {
                                                // console.log(err1, res1);
                                                uploadResult.push({ success: true, msg: 'Success on ULB : ' + payload['ulb_code_year'], data: {
                                                    'valid': validEntry,
                                                    'invalid': invalidEntry
                                                } });
                                            }
                                        });
                                        // if(req.files.length == uploadResult.length){
                                            // res.json({success: true, data: uploadResult});
                                        // }
                                        // res.json({
                                        //     success: true,
                                        //     msg: 'Success',
                                        //     data: {
                                        //         'valid': validEntry,
                                        //         'invalid': invalidEntry
                                        //     }
                                        // });
                                    }
                                });
                        //     }
                        // });




///////////////////////////////////////////////////////////////////////
                    });
                } catch (e) {
                    uploadResult.push({ success: false, msg: 'Corupted excel file for ULB : ' + payload['ulb_code_year'], data: e.toString() });
                    // if(req.files.length == uploadResult.length){
                        // res.json({success: true, data: uploadResult});
                    // }
                    // res.json({
                    //     success: false,
                    //     msg: 'Corupted excel file',
                    //     data: e.toString()
                    // });
                }
            // }
                // });
            });
        } catch (e) {
            uploadResult.push({ success: false, msg: 'Corupted excel file for ULB : ' + payload['ulb_code_year'], data: e.toString() });
            // if(req.files.length == uploadResult.length){
                // res.json({success: true, data: uploadResult});
            // }
            // res.json({
            //     success: false,
            //     msg: 'Corupted excel file',
            //     data: e.toString()
            // });
        }
    // };
};


// var storage = multer.diskStorage({ //multers disk storage settings
//     destination: function (req, file, cb) {
//         cb(null, './uploads/')
//     },
//     filename: function (req, file, cb) {
//         var datetimestamp = Date.now();
//         cb(null, file.fieldname + '-' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length - 1])
//     }
// });

// var upload = multer({ //multer settings
//     storage: storage,
//     fileFilter: function (req, file, callback) { //file filter
//         if (['xls', 'xlsx'].indexOf(file.originalname.split('.')[file.originalname.split('.').length - 1]) === -1) {
//             return callback(new Error('Wrong extension type'));
//         }
//         callback(null, true);
//     }
// }).single('file');