require('./dbConnect');

const ContentSchema = new Schema({
    pdfUrl: [{ type: String }],
    excelUrl: [{ type: String }],

});

const YesNoSchema = new Schema({
    answer: { type: String, enum: ['Yes', 'No'] },
});

const ContentPDFSchema = new Schema({
    pdfUrl: [{ type: String }],
});
const ContentEXCELSchema = new Schema({
    excelUrl: [{ type: String }],
});

const AnnualAccountDataSchema = new Schema(
    {
        ulb: { type: Schema.Types.ObjectId, ref: 'Ulb', required: true },
        year: { type: Schema.Types.ObjectId, ref: 'Year', required: true },
        design_year: { type: Schema.Types.ObjectId, ref: 'Year', required: true },
        audit_status: { type: Schema.Types.ObjectId, ref: '', required: true },

        submit_annual_accounts: { type: YesNoSchema, required: true },
        submit_standardized_data: { type: YesNoSchema, required: true },

        bal_sheet: { type: ContentSchema, required: true },
        bal_sheet_schedules: { type: ContentSchema }, //check if requrired: true or not
        inc_exp: { type: ContentSchema, required: true },
        inc_exp_schedules: { type: ContentSchema }, //check if requrired: true or not
        cash_flow: { type: ContentSchema, required: true },
        cash_flow_schedules: { type: ContentSchema }, //check if requrired: true or not
        auditor_report: { type: ContentPDFSchema, required: true },
        standardized_data: { type: ContentEXCELSchema, required: true },
        modifiedAt: { type: Date, default: Date.now() },
        createdAt: { type: Date, default: Date.now() },
        isActive: { type: Boolean, default: 1 },
    },
    { timestamp: { createdAt: 'createdAt', updatedAt: 'modifiedAt' } }
);
AnnualAccountDataSchema.index(
    { ulb: 1, year: 1, audit_status: 1 },
    { unique: true }
);
module.exports = mongoose.model('AnnualAccountData', AnnualAccountDataSchema);
