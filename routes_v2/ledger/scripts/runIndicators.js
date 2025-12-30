// scripts/runIndicatorsBatch.js
require("dotenv").config({ path: "../../../.env" });  
require("../../../models/dbConnect"); 
const mongoose = require("mongoose");
const ledgerLog = require("../../../models/LedgerLog"); 
const IndicatorsModel = require("../../../models/ledgerIndicators"); 
const { accumulateIndicators } = require("../indicators");

async function processBatch(batch, allLineItems) {
  const promises = batch.map(pair =>
    accumulateIndicators(pair.ulb_id, pair.year, allLineItems).catch(err => {
      console.error(
        `❌ Error in ULB ${pair.ulb_id.toString()} Year ${pair.year}:`,
        err.message
      );
    })
  );
  await Promise.all(promises); // run all docs in batch in parallel
}

async function runIndicatorsBatch(batchSize = 200) {
  try {
    // 1. Fetch all indicators definition
    const allLineItems = await IndicatorsModel.find({})
      .select(["lineItems", "name", "key"])
      .lean();

    if (!allLineItems || allLineItems.length === 0) {
      console.error("⚠️ No Primary indicators found");
      return;
    }

    // 2. Create a cursor for distinct ulb_id + year
    const cursor = ledgerLog.aggregate([
      { $group: { _id: { ulb_id: "$ulb_id", year: "$year" } } },
      { $project: { ulb_id: "$_id.ulb_id", year: "$_id.year", _id: 0 } },
    ]).cursor({ batchSize }).exec();

    let batch = [];
    let counter = 0;

    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      batch.push(doc);
      counter++;

      if (batch.length === batchSize) {
        await processBatch(batch, allLineItems);
        console.log(`✅ Processed ${counter} records so far`);
        batch = [];
      }
    }

    // process any leftover docs
    if (batch.length > 0) {
      await processBatch(batch, allLineItems);
      console.log(`✅ Processed final ${batch.length} records`);
    }

    console.log("🎉 Batch processing complete!");
  } catch (error) {
    console.error("Error running indicators batch:", error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the batch with chosen size
runIndicatorsBatch(200);
