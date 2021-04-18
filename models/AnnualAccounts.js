require('./dbConnect');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const ContentSchema = new Schema({
    pdfUrl: [{ type: String, required: [true, 'ERROR: PDF MUST BE SUBMITTED'] }],
    excelUrl: [{ type: String }],
});


const YesNoSchema = new Schema({
    answer: {
        type: String,
        lowercase: true,
        enum: {
            values: ['yes', 'no'],
            message: 'ERROR: ANSWER CAN BE EITHER YES / NO.'
        },
        required: [true, 'ERROR: ANSWER IS MANDATORY']
    }

});


const ContentPDFSchema = new Schema({
    pdfUrl: [{ type: String }],
});
const ContentEXCELSchema = new Schema({
    excelUrl: [{ type: String }],
});

const AnnualAccountDataSchema = new Schema(
    {
        ulb: { type: Schema.Types.ObjectId, ref: 'Ulb', required: true, },
        year: { type: Schema.Types.ObjectId, ref: 'Year', required: true },
        design_year: { type: Schema.Types.ObjectId, ref: 'Year', required: true },
        audit_status: {
            type: String, enum: {
                values: ['Audited', 'Unaudited'],
                message: "ERROR: AUDIT STATUS CAN BE EITHER 'Audited' or 'Unaudited' "
            }, required: true
        },
        status: {
            type: String, enum: {
                values: ['PENDING', 'APPROVED', 'REJECTED'],
                message: "ERROR: STATUS BE EITHER 'PENDING'/ 'APPROVED' / 'REJECTED'"
            }, default: 'PENDING'
        },
        submit_annual_accounts: { type: YesNoSchema },
        submit_standardized_data: { type: YesNoSchema },
        isCompleted: { type: Boolean, default: false, required: true },
        history: { type: Array, default: [] },
        bal_sheet: { type: ContentSchema },
        bal_sheet_schedules: { type: ContentSchema },
        inc_exp: { type: ContentSchema },
        inc_exp_schedules: { type: ContentSchema },
        cash_flow: { type: ContentSchema },
        cash_flow_schedules: { type: ContentSchema },
        auditor_report: { type: ContentPDFSchema },
        standardized_data: { type: ContentEXCELSchema },
        modifiedAt: { type: Date, default: Date.now() },
        createdAt: { type: Date, default: Date.now() },
        isActive: { type: Boolean, default: 1 },
    },
    { timestamp: { createdAt: 'createdAt', updatedAt: 'modifiedAt' } }
);
AnnualAccountDataSchema.index(
    { ulb: 1, year: 1 },
    // { unique: true }
);
module.exports = mongoose.model('AnnualAccountData', AnnualAccountDataSchema);
