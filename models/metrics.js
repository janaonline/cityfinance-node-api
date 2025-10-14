const mongoose = require('mongoose');

const MetricsSchema = new mongoose.Schema({
  digitizedFiles: { type: Number, default: 0 },
  digitizedPages: { type: Number, default: 0 },
  failedFiles: { type: Number, default: 0 },
  failedPages: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Metrics', MetricsSchema);
