const mongoose = require('mongoose');

const AfsUploadedFileSchema = new mongoose.Schema({
  ulbId: { type: String, required: true },              
  docType: { type: String, required: true },            
  auditStatus: { type: String, enum: ['audited', 'unAudited'], required: true },
  filename: { type: String, required: true },           
  fileType: { type: String, required: true },           
  fileSize: { type: Number, required: true },            
  fileData: { type: Buffer, required: true },            
  uploadedAt: { type: Date, default: Date.now }          
});

module.exports = mongoose.model('AfsUploadedFile', AfsUploadedFileSchema);
