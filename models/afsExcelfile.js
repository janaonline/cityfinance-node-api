// models/afsExcelfile.js
const mongoose = require("mongoose");

const FileSchema = new mongoose.Schema({
  s3Key: { type: String, required: true },
  fileUrl: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: String, enum: ["ULB", "AFS"], required: true },
});

const AFSExcelFileSchema = new mongoose.Schema({
  ulbId: { type: String, required: true },
  financialYear: { type: String, required: true },
  auditType: { type: String, required: true },
  docType: { type: String, required: true },
  files: [FileSchema], // 👈 multiple files stored here
});

module.exports = mongoose.model("AFSExcelFile", AFSExcelFileSchema, "afsexcelfiles");
