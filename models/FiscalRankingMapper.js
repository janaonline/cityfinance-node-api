require("./dbConnect");
const fiscalRankingMapperSchema = new Schema(
    {
        fiscal_ranking: { type: Schema.Types.ObjectId, ref: "FiscalRanking", required: true },
        ulb: { type: Schema.Types.ObjectId, ref: "Ulb", required: true },
        year: { type: Schema.Types.ObjectId, ref: "Year", required: true },
        amount: { type: Number, default: 0 },
        isActive: { type: Boolean, default: 1 },
        type: {
            type: String,
            enum: {
                values: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
                message: "ERROR: STATUS BE EITHER",
            },
        },
        file: { type: String, default: null },
        typeofdata: {
            type: String,
            default : "Number",
            enum: {
                values: ["Number", "PDF", "Excel"],
                message: "ERROR: STATUS BE EITHER",
            },
        }
    },
    { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);
module.exports = mongoose.model("FiscalRankingMapper", fiscalRankingMapperSchema);
