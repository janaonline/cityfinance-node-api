require('./dbConnect');
const LoginHistorySchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    visitSession: { type: Schema.Types.ObjectId, ref: 'VisitSession', default: null },
    loggedInAt: { type: Date, default: Date.now() },
    loggedOutAt: { type: Date, default: null },
    loginType: {
        type: String,
        default: "15thFC",
        enum: {
            values: ["fiscalRankings", "15thFC", "AAINA", "XVIFC", "state-dashboard"],
            message: "ERROR: STATUS BE EITHER 'Fiscal Ranking'/ '15th FC'/ '16th FC' / 'state-dashboard'",
        }
    },
    reports: { type: Array, default: [] },
    isActive: { type: Boolean, default: 1 },
    inactiveSessionTime: { type: Number },
    refreshTokenHash: { type: String, default: null },
    currentRefreshTokenId: { type: String, default: null },
    refreshTokenIssuedAt: { type: Date, default: null },
    refreshTokenLastUsedAt: { type: Date, default: null },
    refreshTokenRotatedAt: { type: Date, default: null }
});
module.exports = mongoose.model('LoginHistory', LoginHistorySchema);
