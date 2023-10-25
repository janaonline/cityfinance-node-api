require('./dbConnect');

const scoreFields = {
    score: {
        type: Number,
        default: 0,
    },
    percentage: {
        type: Number,
        default: 0,
    },
    rank: {
        type: Number,
        default: 0,
    },
}


const ScoringFiscalRankingSchema = new Schema({
    name: { type: String, required: true },
    regionalName: { type: String, default: "" },
    // code: { type: String, required: true, index: { unique: true } },
    state: { type: Schema.Types.ObjectId, ref: 'State', required: true },
    ulb: { type: Schema.Types.ObjectId, ref: 'ulb', required: true },
    population: { type: Number, default: 0 },
    populationBucket: { type: Number, default: 0 },
    censusCode: { type: String, default: null },
    isMillionPlus: { type: String, enum: ["Yes", "No"], default: "No" },
    totalBudget: scoreFields,
    ownRevenue: scoreFields,
    modifiedAt: { type: Date, default: Date.now() },
    createdAt: { type: Date, default: Date.now() },
    isActive: { type: Boolean, default: 1 },
}, { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } });
module.exports = mongoose.model('ScoringFiscalRanking', ScoringFiscalRankingSchema);