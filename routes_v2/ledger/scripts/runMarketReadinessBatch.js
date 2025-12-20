require("dotenv").config({ path: "../../../.env" });
require("../../../models/dbConnect");
const mongoose = require("mongoose");
const ledgerLog = require("../../../models/LedgerLog");
const financialYear = require("../../../models/FinancialYear");
const propertyTax = require("../../../models/PropertyTaxOpMapper");
const ulb = require("../../../models/Ulb");

const {
  calculateYoYGrowth,
  calculateYoY,
  calculatePercentage,
  percentageOf,
  mapPTaxData,
  getIndicatorScore,
  getPreviousFinancialYear,
  getMarketReadinessBand,
} = require("./marketreadinessHelper");

/* ====================== CONFIG ====================== */
const BATCH_SIZE = 500; // write batch
const PARALLEL_LIMIT = 50; // compute parallelism

/* ====================== PRELOAD DATA ====================== */
async function preloadData() {
  console.log("⏳ Preloading reference data...");

  const [yearDocs, ledgerDocs, propertyTaxDocs] = await Promise.all([
    financialYear.find().select({ _id: 1, year: 1 }).lean(),

    ledgerLog
      .find()
      .select({
        ulb_id: 1,
        year: 1,
        indicators: 1,
        lineItems: 1,
        marketReadinessScore: 1,
      })
      .lean(),

    propertyTax
      .find({
        displayPriority: {
          $in: ["1.9", "1.17", "1.18", "1.10", "1.19", "1.11"],
        },
      })
      .select({ ulb: 1, displayPriority: 1, value: 1, year: 1 })
      .lean(),
  ]);

  const yearIdMap = Object.fromEntries(
    yearDocs.map((y) => [y.year, String(y._id)])
  );

  const ledgerIndex = {};
  ledgerDocs.forEach((l) => {
    ledgerIndex[`${l.ulb_id}_${l.year}`] = l;
  });

  const propertyTaxIndex = {};
  propertyTaxDocs.forEach((p) => {
    const key = `${p.ulb}_${p.year}`;
    if (!propertyTaxIndex[key]) propertyTaxIndex[key] = [];
    propertyTaxIndex[key].push(p);
  });

  console.log("✅ Preload complete");
  return { yearIdMap, ledgerIndex, propertyTaxIndex, ledgerDocs };
}

/* ====================== CORE COMPUTE ====================== */
function computeMarketReadinessScoreFast(
  ulbId,
  year,
  yearIdMap,
  ledgerIndex,
  propertyTaxIndex
) {
  const prevYear = getPreviousFinancialYear(year);

  const current = ledgerIndex[`${ulbId}_${year}`];
  const previous = ledgerIndex[`${ulbId}_${prevYear}`];

  if (!current || !previous) return null;

  const ci = current.indicators || {};
  const pi = previous.indicators || {};
  const li = current.lineItems || {};

  /* ---------- Derived Metrics ---------- */
  const growthOSR = calculateYoYGrowth(ci.totOwnRevenue, pi.totOwnRevenue);
  const growthTR = calculateYoYGrowth(ci.totRevenue, pi.totRevenue);

  const netReceivables = (Number(li[431]) || 0) + (Number(li[432]) || 0);

  const adjustedTRPercent = percentageOf(
    Number(ci.totRevenue) - netReceivables,
    ci.totRevenue
  );

  const fixedCharges = (Number(li[210]) || 0) + (Number(li[220]) || 0);

  const fixedChargesByRevExp = percentageOf(
    fixedCharges,
    ci.totRevenueExpenditure
  );

  const omByRevExpPercent = percentageOf(
    Number(li[230]) || 0,
    ci.totRevenueExpenditure
  );

  /* ---------- Property Tax ---------- */
  const currYearId = yearIdMap[year];
  const prevYearId = yearIdMap[prevYear];

  const pTaxRows = [
    ...(propertyTaxIndex[`${ulbId}_${currYearId}`] || []),
    ...(propertyTaxIndex[`${ulbId}_${prevYearId}`] || []),
  ];

  const pTaxMap = mapPTaxData(pTaxRows);

  const pTaxDemandGrowth = calculateYoY(
    pTaxMap["1.9"]?.[currYearId],
    pTaxMap["1.9"]?.[prevYearId]
  );

  const pTaxCollectionGrowth = calculateYoY(
    pTaxMap["1.17"]?.[currYearId],
    pTaxMap["1.17"]?.[prevYearId]
  );

  const pTaxCurrentEff = calculatePercentage(
    pTaxMap["1.18"]?.[currYearId],
    pTaxMap["1.10"]?.[currYearId]
  );

  const pTaxArrearEff = calculatePercentage(
    pTaxMap["1.19"]?.[currYearId],
    pTaxMap["1.11"]?.[currYearId]
  );

  /* ---------- Operating Surplus ---------- */
  let operatingSurplusPercent = null;
  if (ci.totRevenue > 0) {
    operatingSurplusPercent = Number(
      (
        ((ci.totRevenue - ci.OperSurplusTotRevenueExpenditure) /
          ci.totRevenue) *
        100
      ).toFixed(2)
    );
  }

  /* ---------- Section Scores ---------- */
  const sectionScores = [
    {
      section: "REVENUE GENERATION (40%)",
      score:
        getIndicatorScore("OSR_TO_REVENUE", ci.totOwnRevenueByTotRevenue) +
        getIndicatorScore("OSR_GROWTH", growthOSR) +
        getIndicatorScore("GRANTS_TO_REVENUE", ci.grantsByTotRevenue) +
        getIndicatorScore("TR_GROWTH", growthTR) +
        getIndicatorScore("TR_Net", adjustedTRPercent) +
        getIndicatorScore("PTAX_DEMAND_GROWTH", pTaxDemandGrowth) +
        getIndicatorScore("PTAX_COLLECTION_GROWTH", pTaxCollectionGrowth) +
        getIndicatorScore(
          "PTAX_CURRENT_COLLECTION_EFFICIENCY",
          pTaxCurrentEff
        ) +
        getIndicatorScore("PTAX_ARREARS_COLLECTION_EFFICIENCY", pTaxArrearEff),
      maxScore: 40,
    },
    {
      section: "EXPENDITURE MANAGEMENT (20%)",
      score:
        getIndicatorScore("FIX_CHARGES", fixedChargesByRevExp) +
        getIndicatorScore("O&M_EXP", omByRevExpPercent),
      maxScore: 12,
    },
    {
      section: "CASH POSITION (20%)",
      score:
        getIndicatorScore("OPERATING_SURPLUS", operatingSurplusPercent) +
        getIndicatorScore("QA_RATIO", ci.qaRatio),
      maxScore: 20,
    },
    {
      section: "DEBT MANAGEMENT (20%)",
      score:
        getIndicatorScore("TOT_DEBT_OWN_REV", ci.totDebtByTotOwnRevenue) +
        getIndicatorScore("ISCR_RATIO", ci.iscrRatio),
      maxScore: 12,
    },
  ];

  const overallScore = sectionScores.reduce((s, x) => s + x.score, 0);
  const overallMaxScore = sectionScores.reduce((s, x) => s + x.maxScore, 0);

  return {
    version: "v1",
    computedAt: new Date(),
    sectionScores,
    overallScore,
    overallMaxScore,
    marketReadinessBand: getMarketReadinessBand(overallScore),
  };
}

/* ====================== RUNNER ====================== */
async function runBatch() {
  const { yearIdMap, ledgerIndex, propertyTaxIndex, ledgerDocs } =
    await preloadData();

  console.log(`🚀 Processing ${ledgerDocs.length} records`);

  let bulkOps = [];
  let updated = 0;

  for (const doc of ledgerDocs) {
    if (doc.marketReadinessScore?.version === "v1") continue;

    const score = computeMarketReadinessScoreFast(
      doc.ulb_id,
      doc.year,
      yearIdMap,
      ledgerIndex,
      propertyTaxIndex
    );

    if (!score) continue;

    bulkOps.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { marketReadinessScore: score } },
      },
    });

    if (bulkOps.length === BATCH_SIZE) {
      await ledgerLog.bulkWrite(bulkOps);
      updated += bulkOps.length;
      console.log(`✅ Updated ${updated}`);
      bulkOps = [];
    }
  }

  if (bulkOps.length) {
    await ledgerLog.bulkWrite(bulkOps);
    updated += bulkOps.length;
  }

  console.log(`🎉 DONE — Total updated: ${updated}`);
  process.exit(0);
}

/* ====================== START ====================== */
runBatch().catch((err) => {
  console.error("❌ Batch failed:", err);
  process.exit(1);
});
