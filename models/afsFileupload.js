const mongoose = require("mongoose");

const afsFileSchema = new mongoose.Schema({
  ulbId: { type: String, required: true },
  financialYear: { type: String, required: true },
  auditType: { type: String, required: true },
  docType: { type: String, required: true },
  s3Key: { type: String, required: true },
  fileUrl: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
});

afsFileSchema.index({ ulbId: 1, financialYear: 1, auditType: 1 }, { unique: true });

module.exports = mongoose.model("AFSFile", afsFileSchema);
