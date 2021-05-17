require('./dbConnect');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const ContentPDFSchema = new Schema({
    pdfUrl: [{ type: String }],
    pdfName: [{ type: String }],
});


const StateGrantTransferCertificateSchema = new Schema(
    {
        state: { type: Schema.Types.ObjectId, ref: 'State', required: true, },
        design_year: { type: Schema.Types.ObjectId, ref: 'Year', required: true },
        isCompleted: { type: Boolean, default: false, required: true },
        history: { type: Array, default: [] },
        million_tied: { type: ContentPDFSchema },
        nonmillion_tied: { type: ContentPDFSchema },
        nonmillion_untied: { type: ContentPDFSchema },
        modifiedAt: { type: Date, default: Date.now() },
        createdAt: { type: Date, default: Date.now() },
        actionTakenBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        }
    },
    { timestamp: { createdAt: 'createdAt', updatedAt: 'modifiedAt' } }
);
StateGrantTransferCertificateSchema.index(
    { state: 1, design_year: 1 },
    { unique: true }
);
module.exports = mongoose.model('StateGTCertificate', StateGrantTransferCertificateSchema);
