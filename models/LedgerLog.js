const mongoose = require('mongoose');
const LOOKUP = require('../_helper/constants');
const { Schema } = mongoose;
const LedgerLogSchema = mongoose.Schema({
	state_code: {
		type: String,
		required: [true, '"State code" is required']
	},
	state: {
		type: String,
		required: true
	},
	ulb: {
		type: String,
		required: true
	},
	// data for ulb_id, financialYear and design_year is never updated in DB.
	ulb_id: {
		type: Schema.Types.ObjectId,
		ref: 'Ulb',
		default: null
	},
	financialYear: {
		type: String,
		default: null
	},
	design_year: {
		type: Schema.Types.ObjectId,
		ref: 'Year',
		default: null,
	},
	ulb_code: {
		type: String,
		required: true
	},
	ulb_code_year: {
		type: String,
		required: true,
	},
	year: {
		type: String,
		required: true
	},
	// wards, population, area is not needed in LedgerLog? Taken from ulbs collection
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
		enum: { values: ['Audited', 'Unaudited'], message: 'Audit status must be either "Audited" or "Unaudited"' },
		required: [true, 'Audit status is required']
	},
	audit_firm: {
		type: String,
	},
	partner_name: {
		type: String
	},
	icai_membership_number: {
		type: String
	},
	created_at: {
		type: String,
		required: [true, '"Date of Entry" is required']
	},
	created_by: {
		type: String,
		required: [true, '"Entered by" is required']
	},
	verified_at: {
		type: String,
		required: [true, '"Date of verification" is required']
	},
	verified_by: {
		type: String,
		required: [true, '"Verified by" is required']
	},
	// reverified_at and reverified_by to be removed.
	reverified_at: {
		type: String,
		required: [true, '"Date of Re-verification" is required']
	},
	reverified_by: {
		type: String,
		required: [true, '"Re-verified by" is required']
	},
	lastModifiedAt: {
		type: Date,
		default: Date.now()
	},
	isStandardizable: {
		type: String,
		enum: { values: ['Yes', 'No'], message: 'Enter "Yes" or "No"' },
		required: [true, '"Can the file be standardised?" is required']
	},
	isStandardizableComment: {
		type: String,
	},
	dataFlag: {
		type: String,
		required: [true, '"Count of Data Flags failed" cannot be empty']
	},
	dataFlagComment: {
		type: String,
	},

});

LedgerLogSchema.index(
	{
		ulb_id: 1,
		financialYear: 1,
		design_year: 1,
		ulb_code_year: 1
	},
	{
		unique: true
	}
);

module.exports = mongoose.model('LedgerLog', LedgerLogSchema);