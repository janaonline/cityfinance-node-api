const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

/**
 * Enums (replace with your actual enum values)
 */
const DigitizationStatuses = {
	NOT_DIGITIZED: 'NOT_DIGITIZED',
	IN_PROGRESS: 'IN_PROGRESS',
	COMPLETED: 'COMPLETED',
	FAILED: 'FAILED',
};

const UploadedBy = {
	SYSTEM: 'SYSTEM',
	USER: 'USER',
};

const AuditType = {
	AUDITED: 'audited',
	UNAUDITED: 'unaudited',
};

/**
 * DataItem Schema (no _id)
 */
const DataItemSchema = new Schema(
	{
		filename: {
			type: String,
			required: true,
			trim: true,
		},
		s3_key_pdf: {
			type: String,
			required: true,
			trim: true,
		},
		ocr_extraction: {
			type: Schema.Types.Mixed,
		},
		classification: {
			type: Schema.Types.Mixed,
		},
		audit: {
			type: Schema.Types.Mixed,
		},
		summary: {
			type: Schema.Types.Mixed,
		},
		processing: {
			type: Schema.Types.Mixed,
		},
	},
	{ _id: false },
);

/**
 * FileItem Schema (no _id)
 */
const FileItemSchema = new Schema(
	{
		overallConfidenceScore: {
			type: Number,
			default: -1,
		},
		digitizationMsg: {
			type: String,
		},
		digitizationStatus: {
			type: String,
			enum: Object.values(DigitizationStatuses),
			default: DigitizationStatuses.NOT_DIGITIZED,
		},
		totalProcessingTimeMs: {
			type: Number,
		},
		requestId: {
			type: String,
		},
		createdAt: {
			type: Date,
			default: Date.now,
		},
		uploadedBy: {
			type: String,
			enum: Object.values(UploadedBy),
		},
		pdfUrl: {
			type: String,
			trim: true,
		},
		digitizedFileUrl: {
			type: String,
			trim: true,
		},
		noOfPages: {
			type: Number,
		},
		data: {
			type: DataItemSchema,
		},
		queue: {
			type: Schema.Types.Mixed, // Replace with QueueSchema if defined
		},
	},
	{ _id: false },
);

/**
 * Main AfsAuditorsReport Schema
 */
const AfsAuditorsReportSchema = new Schema(
	{
		annualAccountsId: {
			type: Types.ObjectId,
			ref: 'AnnualAccountData',
		},
		ulb: {
			type: Types.ObjectId,
			ref: 'Ulb',
		},
		year: {
			type: Types.ObjectId,
			ref: 'Year',
		},
		auditType: {
			type: String,
			enum: Object.values(AuditType),
			required: true,
		},
		docType: {
			type: String,
			required: true,
			trim: true,
		},
		ulbFile: {
			type: FileItemSchema,
		},
		afsFile: {
			type: FileItemSchema,
		},
	},
	{
		collection: 'afs_auditors_report',
		timestamps: true,
	},
);

module.exports = mongoose.model('AfsAuditorsReport', AfsAuditorsReportSchema);
