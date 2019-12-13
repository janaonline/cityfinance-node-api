const mongoose = require('mongoose');
const LOOKUP = require('../_helper/constants');

const LedgerLogSchema = mongoose.Schema({

	state_code: {
		type: String,
		required: true
	},
	state: {
		type: String,
		required: true
	},
	ulb: {
		type: String,
		required: true
	},
	ulb_code: {
		type: String,
		required: true
	},
	ulb_code_year: {
		type: String,
		required: true,
		unique: true
	},
	year: {
		type: String,
		enum: LOOKUP.BUDGET.YEAR,
		required: true
	},
	wards: {
		type: Number,
	},
	population: {
		type: Number,
		required: true
	},
	area: {
		type: Number
	},
	audit_status: {
		type: String,
		enum: LOOKUP.AUDIT.STATUS,
		required: true
	},
	audit_firm: {
		type: String
	},
	partner_name: {
		type: String
	},
	icai_membership_number: {
		type: String
	},
	created_at: {
		type: String
	},
	created_by: {
		type: String
	},
	verified_at: {
		type: String
	},
	verified_by: {
		type: String
	},
	reverified_at: {
		type: String
	},
	reverified_by: {
		type: String
	},
	lastModifiedAt:{ type:Date, default:Date.now()}

});

const LedgerLog = module.exports = mongoose.model('LedgerLog', LedgerLogSchema);


module.exports.getAll = function (payload, callback) {
	LedgerLog.find(payload, callback);
}

module.exports.addUser = function (newLedgerLogEntry, callback) {
	newLedgerLogEntry.save(callback);
}
