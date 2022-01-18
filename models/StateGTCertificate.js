require("./dbConnect");
const mongoose = require("mongoose");
const { Schema } = mongoose;


const statusType = () => {
  return {
    type: String,
    enum: {
      values: ["PENDING", "APPROVED", "REJECTED"],
      message: "ERROR: STATUS BE EITHER 'PENDING'/ 'APPROVED' / 'REJECTED'",
    },
  };
};

const ContentPDFSchema = new Schema({
  pdfUrl: { type: String },
  pdfName: { type: String },
  status: statusType(),
  rejectReason: { type: String },
  isDraft:{type: Boolean}
});

const StateGrantTransferCertificateSchema = new Schema(
  {
    state: { type: Schema.Types.ObjectId, ref: "State", required: true },
    design_year: { type: Schema.Types.ObjectId, ref: "Year", required: true },
    installment:{type: String},
    isDraft: { type: Boolean, default: true },
    history: { type: Array, default: [] },
    million_tied: { type: ContentPDFSchema },
    nonmillion_tied: { type: ContentPDFSchema },
    nonmillion_untied: { type: ContentPDFSchema },
    modifiedAt: { type: Date, default: Date.now() },
    createdAt: { type: Date, default: Date.now() },
    actionTakenBy: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    status: statusType(),
  },
  { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);
StateGrantTransferCertificateSchema.index(
  { state: 1, design_year: 1, installment:1 },
  { unique: true }
);
module.exports = mongoose.model(
  "StateGTCertificate",
  StateGrantTransferCertificateSchema
);
