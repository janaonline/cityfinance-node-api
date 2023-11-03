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

    totalBudgetDataPC_1: scoreFields,
    ownRevenuePC_2: scoreFields,
    pTaxPC_3: scoreFields,
    cagrInTotalBud_4: scoreFields,
    cagrInOwnRevPC_5: scoreFields,
    cagrInPropTax_6: scoreFields,
    capExPCAvg_7: scoreFields,
    cagrInCapExpen_8: scoreFields,
    omExpTotalRevExpen_9: scoreFields,
    avgMonthsForULBAuditMarks_10a: scoreFields,
    aaPushishedMarks_10b: scoreFields,
    gisBasedPTaxMarks_11a: scoreFields,
    accSoftwareMarks_11b: scoreFields,
    receiptsVariance_12: scoreFields,
    ownRevRecOutStanding_13: scoreFields,
    digitalToTotalOwnRev_14: scoreFields,
    propUnderTaxCollNet_15: scoreFields,

    modifiedAt: { type: Date, default: Date.now() },
    createdAt: { type: Date, default: Date.now() },
    isActive: { type: Boolean, default: 1 },
    // isProvisional: { type: String, enum: ["Yes", "No"], default: "No" } //If the data is taken from Provisional a/c x% will be subtracted from final_score. (Dump to provided with Yes/ No values.)
    
}, { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } });
module.exports = mongoose.model('ScoringFiscalRanking', ScoringFiscalRankingSchema);