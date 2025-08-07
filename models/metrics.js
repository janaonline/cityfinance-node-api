//metrics for AFS digitization
const mongoose = require('mongoose');

const MetricsSchema = new mongoose.Schema({
  username: { type: String, required: true },
  digitizedFiles: { type: Number, default: 0 },
  digitizedPages: { type: Number, default: 0 },
  failedFiles: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Metrics', MetricsSchema);
  