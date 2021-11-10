require('./dbConnect');
const RequestLogSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    url: { type: String, required: true },
    financialYear: { type: String, required: true },
    message: { type: String, default: null },
    status: { type: String, enum: ["SUCCESS", "FAILED", ""], default: "" },
    ulb: { type: Schema.Types.ObjectId, ref: 'Ulb', default: null },
    design_year: { type: Schema.Types.ObjectId, ref: 'Year', default: null },
    completed: { type: Boolean, default: 0 },
    modifiedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
}, { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } });
RequestLogSchema.index({ url: 1, financialYear: 1 }, { unique: true });
module.exports = mongoose.model("RequestLog", RequestLogSchema);

