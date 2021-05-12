require('./dbConnect');
const UASchema = new Schema({
    name: { type: String, required: true, default: null },
    code: { type: String, required: true, index: { unique: true } },
    state: { type: Schema.Types.ObjectId, ref: 'State', required: true },
    ulbs: [{ type: Schema.Types.ObjectId, ref: 'Ulb' }],
    modifiedAt: { type: Date, default: Date.now() },
    createdAt: { type: Date, default: Date.now() },
    isActive: { type: Boolean, default: 1 }
}, { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } });
module.exports = mongoose.model('UA', UASchema);