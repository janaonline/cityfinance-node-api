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

async function processBatch(batch, allLineItems) {
  const promises = batch.map((pair) =>
    accumulateIndicators(pair.ulb_id, pair.year, allLineItems).catch((err) => {
      console.error(`❌ Error in ULB ${pair.ulb_id}:`, err.message);
    })
  );
  await Promise.all(promises);
}

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
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
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

async function triggerIndicatorsBatch(batchSize = 200) {
  if (batchStatus.isRunning) {
    throw new Error("A batch is already running.");
  }

  const allLineItems = await IndicatorsModel.find({})
    .select(["lineItems", "name", "key"])
    .lean();

  const totalRecords = await ledgerLog.aggregate([
    { $group: { _id: { ulb_id: "$ulb_id", year: "$year" } } },
    { $count: "count" },
  ]);

  batchStatus = {
    isRunning: true,
    total: totalRecords[0]?.count || 0,
    processed: 0,
    startTime: new Date(),
    error: null,
  };

  startBackgroundProcessing(batchSize, allLineItems);

  return {
    success: true,
    message: "Batch processing started in the background.",
    totalToProcess: batchStatus.total,
  };
}

function getIndicatorsBatchStatus() {
  const percentage =
    batchStatus.total > 0
      ? ((batchStatus.processed / batchStatus.total) * 100).toFixed(2)
      : 0;

  return {
    isRunning: batchStatus.isRunning,
    progress: `${batchStatus.processed} / ${batchStatus.total}`,
    percentage: `${percentage}%`,
    startTime: batchStatus.startTime,
    error: batchStatus.error,
  };
}

const runIndicatorsBatch = async (req, res) => {
  try {
    const batchSize = req.body.batchSize || 200;
    const result = await triggerIndicatorsBatch(batchSize);
    return res.status(202).json(result);
  } catch (error) {
    const statusCode =
      error.message === "A batch is already running." ? 400 : 500;

    return res.status(statusCode).json({
      success: false,
      error: error.message,
    });
  }
};

const getBatchStatus = (req, res) => {
  return res.json(getIndicatorsBatchStatus());
};

module.exports = {
  runIndicatorsBatch,
  getBatchStatus,
  triggerIndicatorsBatch,
  getIndicatorsBatchStatus,
};