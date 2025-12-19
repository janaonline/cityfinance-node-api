require("dotenv").config({ path: "../../../.env" });
require("../../../models/dbConnect");
const mongoose = require("mongoose");
const ledgerLog = require("../../../models/LedgerLog");
const { computeMarketReadinessScore } = require("../marketReadiness");

async function runBatch(batchSize = 100) {
  const cursor = ledgerLog
    .aggregate([
      { $group: { _id: { ulb_id: "$ulb_id", year: "$year" } } },
      { $project: { ulb_id: "$_id.ulb_id", year: "$_id.year", _id: 0 } },
    ])
    .cursor({ batchSize })
    .exec();

  let processed = 0;

  for (let doc = await cursor.next(); doc; doc = await cursor.next()) {
    const score = await computeMarketReadinessScore(doc.ulb_id, doc.year);

    if (!score) continue;

    await ledgerLog.updateMany(
      { ulb_id: doc.ulb_id, year: doc.year },
      { $set: { marketReadinessScore: score } }
    );

    processed++;
    if (processed % 50 === 0) {
      console.log(`✅ Updated ${processed}`);
    }
  }

  console.log("🎉 Market readiness batch complete");
  mongoose.connection.close();
}

runBatch(100);
