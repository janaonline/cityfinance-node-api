const Metrics = require('../../models/metrics');

module.exports.getAFSMetrics = async (req, res) => {
  try {
    // === STEP 1: Optional real-time update before returning ===
    const { update, success, pages } = req.query;

    if (update === 'true') {
      const pagesCount = parseInt(pages || 0);

      // Get or create metrics document (you usually have just one)
      let metrics = await Metrics.findOne();
      if (!metrics) {
        metrics = new Metrics();
      }

      if (success === 'true') {
        // ✅ Successful digitization
        metrics.digitizedFiles += 1;
        metrics.digitizedPages += pagesCount;
      } else {
        // ❌ Failed digitization
        metrics.failedFiles += 1;
        metrics.failedPages += pagesCount;
      }

      metrics.updatedAt = new Date();
      await metrics.save();
    }

    // === STEP 2: Fetch all metrics for totals ===
    const allMetrics = await Metrics.find({});

    const global = {
      digitizedFiles: allMetrics.reduce((sum, m) => sum + (m.digitizedFiles || 0), 0),
      digitizedPages: allMetrics.reduce((sum, m) => sum + (m.digitizedPages || 0), 0),
      failedFiles: allMetrics.reduce((sum, m) => sum + (m.failedFiles || 0), 0),
      failedPages: allMetrics.reduce((sum, m) => sum + (m.failedPages || 0), 0)
    };

    return res.json({ success: true, global });
  } catch (error) {
    console.error('Error fetching/updating metrics:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
