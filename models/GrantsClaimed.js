require("./dbConnect");
const AmountSchema = new Schema({
    installment: { type: String, default: null },
    amount: { type: String, default: null }
})
const GrantsClaimedSchema = new Schema(
    {
        financialYear: { type: Schema.Types.ObjectId, ref: "Year" },
        state: { type: Schema.Types.ObjectId, ref: "State" },
        modifiedAt: { type: Date, default: Date.now() },
        createdAt: { type: Date, default: Date.now() },
        nmpc_tied: { type: [AmountSchema], default: null },
        nmpc_untied: { type: [AmountSchema], default: null },
        mpc: { type: String, default: null },
    },
    { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);
module.exports = mongoose.model("GrantsClaimed", GrantsClaimedSchema);
