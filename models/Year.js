require('./dbConnect');
const YearSchema = new Schema({
    year: { type: String, default: '2020-21', required: true },
    isActive: { type: Boolean, default: true }
}, { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } });

module.exports = mongoose.model('Year', YearSchema);
