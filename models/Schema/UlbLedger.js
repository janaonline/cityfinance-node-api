require("./dbConnect")
const LedgerSchema = mongoose.Schema({
    ulb : { type: Schema.Types.ObjectId, ref: 'Ulb' },
    lineItem : { type: Schema.Types.ObjectId, ref: 'LineItem' },
    financialYear : { type: Schema.Types.ObjectId, ref: 'FinancialYear' },
    amount:{ type : Number, required : true}

});

const Ledger = module.exports = mongoose.model('Ledger', LedgerSchema);
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
