require('./dbConnect');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const statusType = () => {
    return {
        type: String,
        enum: {
            values: ['PENDING', 'APPROVED', 'REJECTED'],
            message: "ERROR: STATUS BE EITHER 'PENDING'/ 'APPROVED' / 'REJECTED'"
        },
        default: 'PENDING',
    };
};

const ContentSchema = new Schema({
    pdfUrl: [{ type: String, required: [true, 'ERROR: PDF MUST BE SUBMITTED'] }],
    pdfName: [{ type: String, required: [true, 'ERROR: PDF MUST BE SUBMITTED'] }],
    excelUrl: [{ type: String }],
    excelName: [{ type: String }],
    status: statusType(),
    rejectReason: { type: String, default: '' }
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
    pdfName: [{ type: String }],
    status: statusType(),
    rejectReason: { type: String, default: '' }
});


const provisionalDataSchema = new Schema({
    bal_sheet: { type: ContentSchema },
    bal_sheet_schedules: { type: ContentSchema },
    inc_exp: { type: ContentSchema },
    inc_exp_schedules: { type: ContentSchema },
    cash_flow: { type: ContentSchema },
    auditor_report: { type: ContentPDFSchema },
})

const standardizedDataSchema = new Schema({
    upload: {
        excelUrl: { type: String },
        excelName: { type: String }
    },
    auditor_certificate: {
        pdfUrl: { type: String },
        pdfName: { type: String }
    },
    auditor_registration: { type: String },
})

const AnnualAccountDataSchema = new Schema(
    {
        ulb: { type: Schema.Types.ObjectId, ref: 'Ulb', required: true, },
        year: { type: Schema.Types.ObjectId, ref: 'Year', required: true },
        design_year: { type: Schema.Types.ObjectId, ref: 'Year', required: true },
        audit_status: {
            type: String,
            enum:
            {
                values: ['Audited', 'Unaudited'],
                message: "ERROR: AUDIT STATUS CAN BE EITHER 'Audited' or 'Unaudited' "
            },
            required: true
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
        provisional_data: { type: provisionalDataSchema },
        standardized_data: { type: standardizedDataSchema },
        modifiedAt: { type: Date, default: Date.now() },
        createdAt: { type: Date, default: Date.now() },
        isActive: { type: Boolean, default: 1 },
        actionTakenBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        }
    },
    { timestamp: { createdAt: 'createdAt', updatedAt: 'modifiedAt' } }
);
AnnualAccountDataSchema.index(
    { ulb: 1, year: 1 },
    { unique: true }
);
module.exports = mongoose.model('AnnualAccountData', AnnualAccountDataSchema);
