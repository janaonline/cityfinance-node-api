require("./dbConnect");
const { modelSchema } = require('./constants')
const {FRTypeShortKey} = require('../routes/FiscalRanking/formjson')
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
        displayPriority: { type: String, default: null },
        createdAt: { type: Date, default: Date.now() },
        modifiedAt: { type: Date, default: Date.now() },
    },
    { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);
module.exports = mongoose.model("FiscalRankingMapper", fiscalRankingMapperSchema);
