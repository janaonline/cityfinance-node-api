// services/afs-metrics.js
const Metrics = require('../../models/metrics');

module.exports.getAFSMetrics = async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ success: false, message: 'Username required' });
    }

    // Get metrics for current user
    const userMetrics = await Metrics.findOne({ username }) || {
      digitizedFiles: 0,
      digitizedPages: 0,
      failedFiles: 0
    };

    // Get overall global totals
    const allMetrics = await Metrics.find({});
    const global = {
      digitizedFiles: allMetrics.reduce((sum, m) => sum + m.digitizedFiles, 0),
      digitizedPages: allMetrics.reduce((sum, m) => sum + m.digitizedPages, 0),
      failedFiles: allMetrics.reduce((sum, m) => sum + m.failedFiles, 0)
    };

    return res.json({
      success: true,
      user: {
        digitizedFiles: userMetrics.digitizedFiles || 0,
        digitizedPages: userMetrics.digitizedPages || 0,
        failedFiles: userMetrics.failedFiles || 0
      },
      global
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
