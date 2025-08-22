const Metrics = require('../../models/metrics');

module.exports.getAFSMetrics = async (req, res) => {
  try {
    // Fetch all metrics
    const allMetrics = await Metrics.find({});

    // Calculate overall/global totals
    const global = {
      digitizedFiles: allMetrics.reduce((sum, m) => sum + (m.digitizedFiles || 0), 0),
      digitizedPages: allMetrics.reduce((sum, m) => sum + (m.digitizedPages || 0), 0),
      failedFiles: allMetrics.reduce((sum, m) => sum + (m.failedFiles || 0), 0)
    };

    return res.json({
      success: true,
      global
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};