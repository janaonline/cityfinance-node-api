const mongoose = require('mongoose');
const LOOKUP = require('../_helper/constants');

const LedgerSchema = mongoose.Schema({
	ulb_code: {
		type: String,
		required: true,
	},
	head_of_account: {
		type: String,
		required: true
	},
	code: {
		type: Number,
		required: true
	},
	groupCode: {
		type: Number,
	},
	line_item: {
		type: String,
		required: true
	},
	budget: [{
		year: {
			type: String,
			enum: LOOKUP.BUDGET.YEAR,
			required: true
		},
		amount: {
			type: Number,
			required: true
		},
	}]

});

const Ledger = module.exports = mongoose.model('Ledger', LedgerSchema);

module.exports.ledgerSchema = Ledger;

const UlbLedger = require("./Schema/UlbLedger");
module.exports.getAll = function (payload, callback) {
	UlbLedger.aggregate([
		{}
	]).exec(callback);
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





// Ledger.aggregate([ 
// 	{$unwind: "$budget"}, 
// 	{$match: { "budget.year": '2016-17', ulb_code:{$in: ['CG001', 'CG002']}}}, 
// 	{ $group: { _id: "$code", total: {$sum: "$budget.amount"} }} 
// ]).exec(callback);
