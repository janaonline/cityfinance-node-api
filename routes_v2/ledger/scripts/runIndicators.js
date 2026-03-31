const ledgerLog = require("../../../models/LedgerLog");
const IndicatorsModel = require("../../../models/ledgerIndicators");
const { accumulateIndicators } = require("../indicators");

// In-memory status tracker
let batchStatus = {
  isRunning: false,
  total: 0,
  processed: 0,
  startTime: null,
  error: null,
};

/**
 * Internal helper to process a single batch
 */
async function processBatch(batch, allLineItems) {
  const promises = batch.map((pair) =>
    accumulateIndicators(pair.ulb_id, pair.year, allLineItems).catch((err) => {
      console.error(`❌ Error in ULB ${pair.ulb_id}:`, err.message);
    })
  );
  await Promise.all(promises);
}

/**
 * BACKGROUND WORKER: This runs without blocking the API response
 */
async function startBackgroundProcessing(batchSize, allLineItems) {
  try {
    const cursor = ledgerLog
      .aggregate([
        { $group: { _id: { ulb_id: "$ulb_id", year: "$year" } } },
        { $project: { ulb_id: "$_id.ulb_id", year: "$_id.year", _id: 0 } },
      ])
      .cursor({ batchSize })
      .exec();

    let batch = [];
    for (
      let doc = await cursor.next();
      doc != null;
      doc = await cursor.next()
    ) {
      batch.push(doc);

      if (batch.length === batchSize) {
        await processBatch(batch, allLineItems);
        batchStatus.processed += batch.length;
        console.log(`✅ Processed ${batchStatus.processed} records...`);
        batch = [];
      }
    }

    if (batch.length > 0) {
      await processBatch(batch, allLineItems);
      batchStatus.processed += batch.length;
    }

    console.log("🎉 Batch processing complete!");
    batchStatus.isRunning = false;
  } catch (err) {
    batchStatus.error = err.message;
    batchStatus.isRunning = false;
  }
}

/**
 * TRIGGER ROUTE: Starts the batch
 */
const runIndicatorsBatch = async (req, res) => {
  if (batchStatus.isRunning) {
    return res.status(400).json({ message: "A batch is already running." });
  }

  try {
    const allLineItems = await IndicatorsModel.find({})
      .select(["lineItems", "name", "key"])
      .lean();

    // Get total count for progress tracking
    const totalRecords = await ledgerLog.aggregate([
      { $group: { _id: { ulb_id: "$ulb_id", year: "$year" } } },
      { $count: "count" },
    ]);

    // Reset Status
    batchStatus = {
      isRunning: true,
      total: totalRecords[0]?.count || 0,
      processed: 0,
      startTime: new Date(),
      error: null,
    };

    // START PROCESSING IN BACKGROUND (No 'await' here)
    const batchSize = req.body.batchSize || 200;
    startBackgroundProcessing(batchSize, allLineItems);

    // Return immediate response
    res.status(202).json({
      success: true,
      message: "Batch processing started in the background.",
      totalToProcess: batchStatus.total,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * STATUS ROUTE: Check progress
 */
const getBatchStatus = (req, res) => {
  const percentage =
    batchStatus.total > 0
      ? ((batchStatus.processed / batchStatus.total) * 100).toFixed(2)
      : 0;

  res.json({
    isRunning: batchStatus.isRunning,
    progress: `${batchStatus.processed} / ${batchStatus.total}`,
    percentage: `${percentage}%`,
    startTime: batchStatus.startTime,
    error: batchStatus.error,
  });
};

module.exports = {
  runIndicatorsBatch,
  getBatchStatus,
};
