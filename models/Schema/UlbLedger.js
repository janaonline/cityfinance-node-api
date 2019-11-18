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
    Ledger.aggregate([
        {$unwind: "$budget"},
        {$match: { "budget.year": "2016-17"}}
    ]).exec(callback);

    // Ledger.find({"ulb_code": "CG001"}, callback);
}


module.exports.deleteById = function(payload, callback){
    Ledger.deleteOne(payload, callback);
}
