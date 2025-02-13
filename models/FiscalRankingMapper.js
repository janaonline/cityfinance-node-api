require("./dbConnect");
const { modelSchema } = require('./constants')
const { FRTypeShortKey } = require('../routes/FiscalRanking/formjson');

const APPROVAL_TYPES = {
    'ulbEnteredPmuAccept': 1,
    'ulbEnteredPmuReject': 2,
    'enteredPmuAcceptUlb': 3,
    'enteredPmuRejectUlb': 4,
    'enteredUlbAcceptPmu': 5,
    'enteredPmuAcceptPmu': 6,
    'enteredPmuSecondAcceptPmu': 7,
    'enteredPmuAcceptPmuAuto': 8,
}
const fiscalRankingMapperSchema = new Schema(
    {
        fiscal_ranking: { type: Schema.Types.ObjectId, ref: "FiscalRanking", required: true },
        ulb: { type: Schema.Types.ObjectId, ref: "Ulb", required: true },
        year: { type: Schema.Types.ObjectId, ref: "Year", required: true },
        value: { type: Schema.Types.Mixed, default: null },
        date: { type: Date, default: null }, // audit date
        status: {
            type: String,
            default: "PENDING",
            enum: {
                values: ["PENDING", "APPROVED", "REJECTED", "NA"],
                message: "ERROR: STATUS BE EITHER 'PENDING'/ 'APPROVED' / 'REJECTED'",
            },
        },
        rejectReason :{
            type:String,
            default:""
        },
        rejectReason2: { type: String, default: "" },
        isActive: { type: Boolean, default: 1 },
        modelName: modelSchema(),
        type: {
            type: String,
            enum: {
                values: FRTypeShortKey,
                message: "ERROR: STATUS BE EITHER",
            },
        },
        file: {
            name: { type: String },
            url: { type: String }
        },
        typeofdata: {
            type: String,
            default: "number",
            enum: {
                values: ["number", "file", "date", "radio-toggle", "text", "url"],
                message: "ERROR: STATUS BE EITHER",
            },
        },
        ledgerUpdated: { type: Boolean, default: false },
        displayPriority: { type: Number, default: null },
        suggestedValue: { type: Schema.Types.Mixed, default: null },
        ulbComment: { type:String, default:""},
        ulbValue: { type: Schema.Types.Mixed, default: null },
        pmuSuggestedValue2: { type: Schema.Types.Mixed, default: null },
        approvalType: {
            type: Number,
            default: null,
            enum: {
              values: Object.values(APPROVAL_TYPES),
              message: "Allowed values are " + Object.keys(APPROVAL_TYPES).join(', '),
            },
          },
        // createdAt: { type: Date, default: Date.now() },
        // modifiedAt: { type: Date, default: Date.now() },
    },
    { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);
fiscalRankingMapperSchema.index(
    {fiscal_ranking:1},
    {type:1},
    {ulb:1},
    {year:1}
);
module.exports = mongoose.model("FiscalRankingMapper", fiscalRankingMapperSchema);
