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
            values: ["fiscalRankings", "15thFC", "AAINA"],
            message: "ERROR: STATUS BE EITHER 'Fiscal Ranking'/ '15th FC'",
        },
    },
    reports: { type: Array, default: [] },
    isActive: { type: Boolean, default: 1 },
    inactiveSessionTime: { type: Number }
});
module.exports = mongoose.model('LoginHistory', LoginHistorySchema);