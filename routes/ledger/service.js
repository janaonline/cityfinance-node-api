const LedgerLogModel = require('../../models/LedgerLog');
const UlbLedger = require('../../models/UlbLedger');
const mongoose = require("mongoose");
const moment = require("moment");
const ObjectId = require('mongoose').Types.ObjectId;
const Ulb = require('../../models/Ulb');


// Get Income expenditure report
module.exports.getIE = function (req, res) {

    if(!req.body.ulbList || req.body.ulbList.length == 0 || req.body.ulbIds.length == 0){
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
            // Get all the ulb codes, for whose balance sheet has been requested
            ulbCodeArr.push(req.body.ulbList[i].code);
        }
    }

    let payload = {};
    payload['head_of_account'] = { $match:{ "lineitems.headOfAccount":{$in : ['Revenue','Expense']} } };
    payload['ulb_code']= { $match: { "ulbs.code":{$in : ulbCodeArr} } } ;

    // For all the ulb codes, ulb its will also be there
    let ulbIds = req.body.ulbIds ? req.body.ulbIds.map(m=> mongoose.Types.ObjectId(m)) : "NA";

    var aggregateCondition = condition(ulbIds);

    // using both, ulb codes and ulb ids for filtering data from ledger collection
    aggregateCondition.splice(3, 0, payload['ulb_code'],payload['head_of_account']);

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

    if(!req.body.ulbList || req.body.ulbList.length == 0 || req.body.ulbIds.length == 0){
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
            // Get all the ulb codes, for whose balance sheet has been requested
            ulbCodeArr.push(req.body.ulbList[i].code);
        }
    }

    let payload = {};
    payload['head_of_account'] = { $match:{ "lineitems.headOfAccount":{$in : ['Asset','Liability']} } };
    payload['ulb_code']= { $match:{ "ulbs.code":{$in : ulbCodeArr} } } ;

    // For all the ulb codes, ulb its will also be there
    let ulbIds = req.body.ulbIds ? req.body.ulbIds.map(m=> mongoose.Types.ObjectId(m)) : "NA";

    var aggregateCondition = condition(ulbIds);
    // make aggregate condition to find out ledgers which will be included in balance sheet
    // using both, ulb codes and ulb ids for filtering data from ledger collection
    aggregateCondition.splice(3, 0, payload['ulb_code'],payload['head_of_account']);

    UlbLedger.aggregate(aggregateCondition).exec(function(err, result){
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

module.exports.getAll = (req, res)=>{

}
// Get all ledgers
module.exports.getAllLegders = async function (req, res) {
    let year = req.body.year ? ( req.body.year.length? req.body.year:null ) : null;
    let ulb = req.body.ulb ? ( req.body.ulb.length ? req.body.ulb:null ) : null;
    let condition =  { isActive:true };
    year ? condition[ "financialYear"] =  {$all:year } : null;
    ulb = ulb ? ulb.map(x=> ObjectId(x)):null;
    ulb ? condition["ulb"] =  {$in:ulb } : null;
    let ulbMatch = {}
    if(ulb){
        ulbMatch ={'ulb._id' : condition[ "ulb"]}
    }

    if(!year){
        // if year is empty, then take all the ledgers from the database irrespective of any year filter
        UlbLedger.aggregate([
            {$match:condition},
            {$group:{
                    _id:{
                        ulb : "$ulb",
                        financialYear : "$financialYear"
                    },
                    amount :{$sum : "$amount"}
                }
            },
            {$lookup:{
                    from:"ulbs",
                    as:"ulbs",
                    foreignField : "_id",
                    localField:"_id.ulb"
                }
            },
            {$lookup:{
                    from:"states",
                    as:"states",
                    foreignField : "_id",
                    localField:"ulbs.state"
                }
            },
            {$lookup:{
                    from:"ulbtypes",
                    as:"ulbtypes",
                    foreignField : "_id",
                    localField:"ulbs.ulbType"
                }
            },
            {$project:{
                    "ulbs":{ $arrayElemAt  :  [ "$ulbs",0]},
                    "states":{ $arrayElemAt  :  [ "$states",0]},
                    "ulbtypes":{ $arrayElemAt  :  [ "$ulbtypes",0]},
                    financialYear:"$_id.financialYear",
                    amount:1
                }
            },
            {$project:{
                    _id:0,
                    ulb : { $cond : ["$ulbs","$ulbs","NA"]},
                    state : { $cond : ["$states","$states","NA"]},
                    ulbtypes : { $cond : ["$ulbtypes","$ulbtypes","NA"]},
                    financialYear:1,
                    amount:1
                }
            },
            {$match:ulbMatch}
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

    }else{
        // if year is present, then take all the ledgers from the database of year filter
        UlbLedger.aggregate([
            {$match:{  isActive:true }},
            {$group:{
                    _id:{
                        ulb : "$ulb",
                    },
                    population : {$first:"$population"},
                    financialYear : {$addToSet:"$financialYear"},
                }
            },
            {$match:{
                    financialYear : condition[ "financialYear"]
                }
            },
            {$lookup:{
                    from:"ulbs",
                    as:"ulbs",
                    foreignField : "_id",
                    localField:"_id.ulb"
                }
            },
            {$lookup:{
                    from:"states",
                    as:"states",
                    foreignField : "_id",
                    localField:"ulbs.state"
                }
            },
            {$lookup:{
                    from:"ulbtypes",
                    as:"ulbtypes",
                    foreignField : "_id",
                    localField:"ulbs.ulbType"
                }
            },
            {$project:{
                    "ulbs":{ $arrayElemAt  :  [ "$ulbs",0]},
                    "states":{ $arrayElemAt  :  [ "$states",0]},
                    "ulbtypes":{ $arrayElemAt  :  [ "$ulbtypes",0]},
                    financialYear:"$_id.financialYear",
                    amount:1,
                    population : 1
                }
            },
            {$project:{
                    _id:0,
                    ulb : { $cond : ["$ulbs","$ulbs","NA"]},
                    state : { $cond : ["$states","$states","NA"]},
                    ulbtypes : { $cond : ["$ulbtypes","$ulbtypes","NA"]},
                    financialYear:1,
                    amount:1,
                    population:1
                }
            },
            {$match:ulbMatch},
            {$match:{ amount : {$ne: 0}} }
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

module.exports.getAllUlbLegders = async function(req,res){

    Ulb.aggregate([
        {$match:{isActive:true}},
        {$lookup:
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
        {$unwind:{path:'$ulbledger',preserveNullAndEmptyArrays: true}},
        {$unwind:'$state'},
        {$group:{
                _id:{
                    ulb : "$_id",
                    name:"$name",
                    financialYear :  {
                        $cond:{
                         if: '$ulbledger.financialYear',
                         then: '$ulbledger.financialYear',
                         else: 'NA'
                        }
                    },
                },
                state: { "$first": "$state"}
            }
        },
        {$group:{
                _id:{
                    ulb : "$_id.ulb",
                    name :"$_id.name"
                },    
                financialYear :{$push: {
                      $cond:[
                        { $eq: ["$_id.financialYear",'NA']},
                        null,
                        "$_id.financialYear"
                    ]
                  }},
                state: { "$first": "$state"}
            }
        },
        {$group:{
                _id:{
                    state : "$state._id",
                    name :"$state.name"
                },    
                ulbList :{$push: {financialYear:"$financialYear",ulb:"$_id.ulb",name:"$_id.name"}}
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
module.exports.getAllLedgersCsv = function(req,res){
    let filename = "All Ledgers " + (moment().format("DD-MMM-YY HH:MM:SS")) + ".csv";

    // Set approrpiate download headers
    res.setHeader("Content-disposition", "attachment; filename=" + filename);
    res.writeHead(200, { "Content-Type": "text/csv;charset=utf-8,%EF%BB%BF" });
    res.write("ULB Name, ULB Code, AMRUT, Head of account,Code, Line Item, Budget year, Budget amount\r\n");
    // Flush the headers before we start pushing the CSV content
    res.flushHeaders();

    const cursor = UlbLedger.aggregate([
        {   $lookup:{
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
        {$lookup:{
                from:"states",
                as:"states",
                foreignField : "_id",
                localField:"ulbs.state"
            }
        },
        {$lookup:{
                from:"ulbtypes",
                as:"ulbtypes",
                foreignField : "_id",
                localField:"ulbs.ulbType"
            }
        },
        {$project:{
                "ulbs":{ $arrayElemAt  :  [ "$ulbs",0]},
                "states":{ $arrayElemAt  :  [ "$states",0]},
                "ulbtypes":{ $arrayElemAt  :  [ "$ulbtypes",0]},
                "lineitems":{ $arrayElemAt  :  [ "$lineitems",0]},
                financialYear:"$financialYear",
                amount:1,
                population : 1
            }
        },
        {$project:{
                _id:0,
                ulb : { $cond : ["$ulbs","$ulbs","NA"]},
                state : { $cond : ["$states","$states","NA"]},
                ulbtypes : { $cond : ["$ulbtypes","$ulbtypes","NA"]},
                line_item : { $cond : ["$lineitems","$lineitems","NA"]},
                financialYear:1,
                amount:1,
                population:1
            }
        }
    ]).cursor({batchSize:50}).exec()
        cursor.on("data",function(el){
            let line_item = el.line_item ? el.line_item.name.toString().replace(/[,]/g, ' | ') : "";
            el.code = el.line_item ? el.line_item.code : "";
            el.head_of_account =  el.line_item ? el.line_item.headOfAccount : "";
            el.ulb.name = el.ulb ? el.ulb.name.toString().replace(/[,]/g, ' | ')  : "";
            res.write(el.ulb.name+","+el.ulb.code+","+el.ulb.amrut+","+el.head_of_account+","+el.code+","+line_item+","+el.financialYear+","+el.amount+"\r\n");
        }) 
        cursor.on("end",function(el){
            res.end()
        })
}
//@LedgerLog
module.exports.getAllLogs = function (req, res) {
    LedgerLogModel.find({}, (err, out) => {
        if (err) {
            res.json({success: false, msg: 'Invalid Payload', data: err.toString() });
        }
        res.json({success: true, msg: 'Success', data: out });
    })
};
module.exports.addLog = function(req, res){
    let newLog = new LedgerLogModel({
        particular: req.body.particular,
        mobile: req.body.mobile,
        email: req.body.email,
        isUserExist: req.body.isUserExist
    });
    newLog.save(newLog, (err, user)=>{
        if(err){
            res.json({success:false, msg:'Failed to log'});
        }else{
            res.json({success:true, msg:'Log registered'})
        }
    });
};
function condition(ulbs){
    return [
        {$match: { ulb : {$in:ulbs}}},
        {$lookup:{
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
                population:{$first:"$ulbs.population"}
            }
        },
        {$project:{
                _id:0,
                head_of_account:1,
                code:1,
                ulb_code:1,
                line_item:1,
                budget:1,
                population:1
            }
        }]
}