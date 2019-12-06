require("./dbConnect")
const LedgerSchema = mongoose.Schema({
    ulb : { type: Schema.Types.ObjectId, ref: 'Ulb' },
    lineItem : { type: Schema.Types.ObjectId, ref: 'LineItem' },
    financialYear : { type : String, required : true,index:true, enum:[ "2015-16","2016-17","2017-18"]},
    amount : { type : Number, required : true},
    modifiedAt : { type: Date, default : Date.now() },
    createdAt : { type: Date, default : Date.now() },
    isActive : { type  : Boolean, default : 1 }
});


LedgerSchema.index(
    { 
        ulb : 1,
        financialYear: 1,
        lineItem: 1,
    },
    { 
        unique: true 
    }
);
const Ledger = module.exports = mongoose.model('ULBLedger', LedgerSchema);
module.exports.ledgerSchema = Ledger;

module.exports.getAll = function (payload, callback) {
    Ledger.find(payload, callback);
}


module.exports.byId = function (entryId, callback) {
    Ledger.findById(entryId, callback);
}

module.exports.bulkInsert = function (ledgerArr, callback) {
    // Ledger.create(ledgerArr, callback);
    Ledger.collection.insertMany(ledgerArr, callback);
}

module.exports.getAggregate = function (payload, callback) {
    Ledger.aggregate([
        {$unwind: "$budget"},
        {$match: { "budget.year": payload.year, ulb_code:{$in: payload.ulbList}}},
        { $group: { _id: "$code", total: {$sum: {"$toDouble": "$budget.amount"} } }}
    ]).exec(callback);

    // Ledger.find({"ulb_code": "CG001"}, callback);
}



module.exports.getAllLedgers = function (payload, callback) {
    let year = payload.body.year ? ( payload.body.year.length? payload.body.year:null ) : null;
    let condition =  { isActive:true };
    year ? condition[ "financialYear"] =  {$in:year } : null;
    Ledger.aggregate([
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
            {$project:{
                    "ulbs":{ $arrayElemAt  :  [ "$ulbs",0]},
                    "states":{ $arrayElemAt  :  [ "$states",0]},
                    financialYear:"$_id.financialYear",
                    amount:1
                }
            },
            {$project:{
                    _id:0,
                    ulb : { $cond : ["$ulbs","$ulbs","NA"]},
                    state : { $cond : ["$states","$states","NA"]},
                    financialYear:1,
                    amount:1
                }
            }
    ]).exec(callback);

    // Ledger.find({"ulb_code": "CG001"}, callback);
}


module.exports.deleteById = function(payload, callback){
    Ledger.deleteOne(payload, callback);
}
