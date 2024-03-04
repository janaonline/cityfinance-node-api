require('./dbConnect');
const UASchema = new Schema({
    name: { type: String, required: true, default: null },
    state: { type: Schema.Types.ObjectId, ref: 'State', required: true },
    ulb: [{ type: Schema.Types.ObjectId, ref: 'Ulb' }],
    modifiedAt: { type: Date, default: Date.now() },
    createdAt: { type: Date, default: Date.now() },
    UACode: { type: String, default: null },
}, { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } });
module.exports = mongoose.model('UA', UASchema);