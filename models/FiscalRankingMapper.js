require("./dbConnect");
const fiscalRankingMapperSchema = new Schema(
    {
        fiscal_ranking: { type: Schema.Types.ObjectId, ref: "FiscalRanking", required: true },
        ulb: { type: Schema.Types.ObjectId, ref: "Ulb", required: true },
        year: { type: Schema.Types.ObjectId, ref: "Year", required: true },
        amount: { type: Number, default: null },
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
        type: {
            type: String,
            enum: {
                values: [
                    "totalRcptActl",
                    "totalRcptWaterSupply",
                    "totalRcptSanitation",
                    "totalRcptBudget",
                    "totalOwnRvnue",
                    "totalProperty",
                    "totalTaxRevWaterSupply",
                    "totalTaxRevSanitation",
                    "totalFeeChrgWaterSupply",
                    "totalFeeChrgSanitation",
                    "totalCaptlExp",
                    "totalCaptlExpWaterSupply",
                    "totalCaptlExpSanitation",
                    "totalOmExp",
                    "totalCaptlExpWaterSupply",
                    "totalOMCaptlExpSanitation",
                    "totalRevExp",
                    "appAnnualBudget",
                    "auditedAnnualFySt",
                    "auditReprtDate"
                ],
                message: "ERROR: STATUS BE EITHER",
            },
        },
        file: {
            name: { type: String },
            url: { type: String }
        },
        typeofdata: {
            type: String,
            default: "Number",
            enum: {
                values: ["Number", "PDF", "Excel", "Date"],
                message: "ERROR: STATUS BE EITHER",
            },
        },
        createdAt: { type: Date, default: Date.now() },
        modifiedAt: { type: Date, default: Date.now() },
    },
    { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);
module.exports = mongoose.model("FiscalRankingMapper", fiscalRankingMapperSchema);
