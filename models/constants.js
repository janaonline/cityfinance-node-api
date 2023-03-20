const modelSchema = () => {
    return {
        type: String,
        enum: {
            values: ["ULBLedger", "FiscalRanking", "Ulb", "TwentyEightSlbForm"]
        }
    }
}
module.exports = {
    modelSchema
}