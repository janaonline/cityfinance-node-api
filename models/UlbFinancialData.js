require('./dbConnect');
const audited = function () {
    return this.audited;
};
const statusType = () => {
    return {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED', 'NA'],
        default: 'NA',
    };
};
const overallStatusType = () => {
    return {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'PENDING',
    };
};
const ContentSchema = new Schema({
    pdfUrl: { type: String },
    excelUrl: { type: String },
    completeness: statusType(),
    correctness: statusType(),
    message: { type: String, default: '' },
});
const UlbFinancialDataSchema = new Schema(
    {
        referenceCode: { type: String, default: '' },
        ulb: { type: Schema.Types.ObjectId, ref: 'Ulb', required: true },
        financialYear: { type: String, required: true },
        audited: { type: Boolean, default: false },
        balanceSheet: { type: ContentSchema, required: true },
        schedulesToBalanceSheet: { type: ContentSchema, required: true },
        incomeAndExpenditure: { type: ContentSchema, required: true },
        schedulesToIncomeAndExpenditure: {
            type: ContentSchema,
            required: true,
        },
        trialBalance: { type: ContentSchema, required: true },
        auditReport: { type: ContentSchema, required: audited },
        overallReport: { type: ContentSchema, default: null },
        completeness: overallStatusType(),
        correctness: overallStatusType(),
        status: overallStatusType(),
        actionTakenBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        history: { type: Array, default: [] },
        modifiedAt: { type: Date, default: Date.now() },
        createdAt: { type: Date, default: Date.now() },
        isActive: { type: Boolean, default: 1 },
    },
    { timestamp: { createdAt: 'createdAt', updatedAt: 'modifiedAt' } }
);
UlbFinancialDataSchema.index(
    { ulb: 1, financialYear: 1, audited: 1 },
    { unique: true }
);
module.exports = mongoose.model('UlbFinancialData', UlbFinancialDataSchema);
