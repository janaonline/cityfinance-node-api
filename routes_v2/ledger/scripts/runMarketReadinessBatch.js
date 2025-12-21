require("dotenv").config({ path: "../../../.env" });
require("../../../models/dbConnect");

const mongoose = require("mongoose");
const ledgerLog = require("../../../models/LedgerLog");
const financialYear = require("../../../models/Year");
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
const BATCH_SIZE = 500;

/* ====================== PRELOAD DATA ====================== */
async function preloadData() {
  console.log("⏳ Preloading reference data...");

  const [yearDocs, ledgerDocs] = await Promise.all([
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
  ]);

  const yearIdMap = Object.fromEntries(
    yearDocs.map((y) => [y.year, String(y._id)])
  );

  const ledgerIndex = {};
  ledgerDocs.forEach((l) => {
    ledgerIndex[`${l.ulb_id}_${l.year}`] = l;
  });

  console.log("✅ Preload complete");
  return { yearIdMap, ledgerIndex, ledgerDocs };
}

/* ====================== CORE COMPUTE ====================== */
async function computeMarketReadinessScoreFast(
  ulbId,
  year,
  yearIdMap,
  ledgerIndex
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

  /* ====================== PROPERTY TAX (FIXED) ====================== */
  // console.log("Computing Property Tax metrics...", yearIdMap, prevYear, year);
  const currYearId = yearIdMap[year];
  const prevYearId = yearIdMap[prevYear];
  // console.log("Fetching Property Tax data for ULB:", ulbId);
  // console.log(
  //   "Current Year ID:",
  //   year,
  //   "Previous Year ID:",
  //   prevYear,
  //   currYearId,
  //   prevYearId
  // );
  const pTaxDocs = await propertyTax
    .find({
      ulb: new mongoose.Types.ObjectId(ulbId),
      year: {
        $in: [
          new mongoose.Types.ObjectId(currYearId),
          new mongoose.Types.ObjectId(prevYearId),
        ],
      },
      displayPriority: {
        $in: ["1.9", "1.17", "1.18", "1.10", "1.19", "1.11"],
      },
    })
    .select({ displayPriority: 1, value: 1, year: 1 })
    .lean();
  // console.log("Property Tax Docs:", pTaxDocs);
  const pTaxMap = mapPTaxData(pTaxDocs);
  // console.log("Mapped Property Tax Data:", pTaxMap);
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
  // console.log("Computed Property Tax Metrics:", {
  //   pTaxDemandGrowth,
  //   pTaxCollectionGrowth,
  //   pTaxCurrentEff,
  //   pTaxArrearEff,
  // });
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
  const rawDebtScore = getIndicatorScore(
    "TOT_DEBT_OWN_REV",
    ci?.totDebtByTotOwnRevenue,
    "Debt / Own Source Revenue"
  );

  const isDebtScoreMissing = !Number.isFinite(ci?.totDebtByTotOwnRevenue);
  /* ================= REVENUE GENERATION ================= */

  const osr = getIndicatorScore(
    "OSR_TO_REVENUE",
    ci?.totOwnRevenueByTotRevenue,
    "Own Source Revenue to Total Revenue Receipts"
  );

  const osrGrowth = getIndicatorScore(
    "OSR_GROWTH",
    growthOSR,
    "Y-o-Y Growth in Own Source Revenue"
  );

  const grantsRatio = getIndicatorScore(
    "GRANTS_TO_REVENUE",
    ci?.grantsByTotRevenue,
    "Revenue Grants to Total Revenue Receipts"
  );

  const trGrowth = getIndicatorScore(
    "TR_GROWTH",
    growthTR,
    "Y-o-Y Growth in Total Revenue receipts"
  );

  const trNet = getIndicatorScore(
    "TR_Net",
    adjustedTRPercent,
    "Adjustments to TR (TR-Net Receivables) as % of TR"
  );

  const pTaxDemand = getIndicatorScore(
    "PTAX_DEMAND_GROWTH",
    pTaxDemandGrowth,
    "Y-o-Y Growth in Property tax total demand"
  );

  const pTaxCollection = getIndicatorScore(
    "PTAX_COLLECTION_GROWTH",
    pTaxCollectionGrowth,
    "Y-o-Y Growth in Property tax total collections"
  );

  const pTaxCurrentEffs = getIndicatorScore(
    "PTAX_CURRENT_COLLECTION_EFFICIENCY",
    pTaxCurrentEff,
    "Property tax current collection efficiency"
  );

  const pTaxArrearEffs = getIndicatorScore(
    "PTAX_ARREARS_COLLECTION_EFFICIENCY",
    pTaxArrearEff,
    "Property tax average arrear collection efficiency"
  );

  /* ================= EXPENDITURE ================= */

  const fixedCharge = getIndicatorScore(
    "FIX_CHARGES",
    fixedChargesByRevExp,
    "Fixed Charges to Revenue Expenditure"
  );

  const omExp = getIndicatorScore(
    "O&M_EXP",
    omByRevExpPercent,
    "O&M Expenditure to Revenue Expenditure"
  );

  /* ================= CASH POSITION ================= */

  const operatingSurplus = getIndicatorScore(
    "OPERATING_SURPLUS",
    operatingSurplusPercent,
    "Operating Surplus"
  );

  const quickRatio = getIndicatorScore("QA_RATIO", ci?.qaRatio, "Quick Ratio");

  /* ================= DEBT ================= */

  const iscr = getIndicatorScore(
    "ISCR_RATIO",
    ci?.iscrRatio,
    "Interest Service Coverage Ratio (ISCR)"
  );

  /* ====================== SECTIONS ====================== */

  const sections = [
    {
      section: "REVENUE GENERATION (40%)",
      description:
        "Measures the growth, composition and efficiency of revenue income sources",
      rows: [
        {
          name: osr.label ?? "Own Source Revenue to Total Revenue Receipts",
          maxScore: 4,
          score: osr.score,
          outOfRange: osr.outOfRange,
        },
        {
          name: "Y-o-Y Growth in Own Source Revenue",
          maxScore: 4,
          score: osrGrowth.score,
          outOfRange: osrGrowth.outOfRange,
        },
        {
          name: "Revenue Grants to Total Revenue Receipts",
          maxScore: 4,
          score: grantsRatio.score,
          outOfRange: grantsRatio.outOfRange,
        },
        {
          name: "Y-o-Y Growth in Total Revenue receipts",
          maxScore: 4,
          score: trGrowth.score,
          outOfRange: trGrowth.outOfRange,
        },
        {
          name: "Adjustments to TR (TR-Net Receivables) as % of TR",
          maxScore: 8,
          score: trNet.score,
          outOfRange: trNet.outOfRange,
        },
        {
          name: "Y-o-Y Growth in Property tax total demand",
          maxScore: 4,
          score: pTaxDemand.score,
          outOfRange: pTaxDemand.outOfRange,
        },
        {
          name: "Y-o-Y Growth in Property tax total collections",
          maxScore: 4,
          score: pTaxCollection.score,
          outOfRange: pTaxCollection.outOfRange,
        },
        {
          name: "Property tax current collection efficiency",
          maxScore: 4,
          score: pTaxCurrentEffs.score,
          outOfRange: pTaxCurrentEffs.outOfRange,
        },
        {
          name: "Property tax average arrear collection efficiency",
          maxScore: 4,
          score: pTaxArrearEffs.score,
          outOfRange: pTaxArrearEffs.outOfRange,
        },
      ],
    },
    {
      section: "EXPENDITURE MANAGEMENT (20%)",
      description:
        "Measures revenue and capital expenditure components including overspending/underspending",
      rows: [
        {
          name: "Fixed Charges to Revenue Expenditure",
          maxScore: 8,
          score: fixedCharge.score,
          outOfRange: fixedCharge.outOfRange,
        },
        {
          name: "O&M Expenditure to Revenue Expenditure",
          maxScore: 4,
          score: omExp.score,
          outOfRange: omExp.outOfRange,
        },
        {
          name: "Capital Utilization Ratio (Capital Expenditure / Capital Receipts)**",
          maxScore: 8,
          score: "N/A",
          excludeFromScore: true,
        },
      ],
    },
    {
      section: "CASH POSITION (20%)",
      description:
        "Measures capacity to borrow based on revenue surplus and liquidity position",
      rows: [
        {
          name: "Operating Surplus",
          maxScore: 10,
          score: operatingSurplus.score,
          outOfRange: operatingSurplus.outOfRange,
        },
        {
          name: "Quick Ratio",
          maxScore: 10,
          score: quickRatio.score,
          outOfRange: quickRatio.outOfRange,
        },
      ],
    },
    {
      section: "DEBT MANAGEMENT (20%)",
      description:
        "Measures debt levels against the operating receipts generated",
      rows: [
        {
          name: "Debt / Own Source Revenue",
          maxScore: 8,
          score: isDebtScoreMissing ? "N/A" : rawDebtScore,
          derived: isDebtScoreMissing,
        },
        {
          name: "Debt Service Coverage Ratio (DSCR)**",
          maxScore: 8,
          score: "N/A",
        },
        {
          name: "Interest Service Coverage Ratio (ISCR)",
          maxScore: 4,
          score: iscr.score,
          outOfRange: iscr.outOfRange,
        },
      ],
    },
  ];
  /* ---------------- SECTION & OVERALL SCORES ---------------- */

  var sectionScores = sections.map((sec) => {
    var score = sec.rows.reduce(
      (sum, row) => sum + (Number(row.score) || 0),
      0
    );

    var maxScore = sec.rows.reduce(
      (sum, row) => sum + (Number(row.maxScore) || 0),
      0
    );

    return {
      section: sec.section,
      score,
      maxScore,
    };
  });

  var overallScore = sectionScores.reduce((sum, s) => sum + s.score, 0);

  var overallMaxScore = sectionScores.reduce((sum, s) => sum + s.maxScore, 0);
  if (isDebtScoreMissing) {
    // console.log("inside");
    const adjustedOverallScore = Number((overallScore * (84 / 72)).toFixed(2));
    // console.log(adjustedOverallScore, "adjust score");
    const derivedDebtScore = Number(
      (adjustedOverallScore - overallScore).toFixed(2)
    );
    // console.log(derivedDebtScore, overallScore, "tjos osas");
    // Inject derived score
    sections.forEach((sec) => {
      if (sec.section.startsWith("DEBT MANAGEMENT")) {
        sec.rows.forEach((row) => {
          if (row.derived) {
            row.score = derivedDebtScore;
          }
        });
      }
    });

    // Recalculate section scores
    sectionScores = sections.map((sec) => {
      score = sec.rows.reduce(
        (sum, row) =>
          sum + (Number.isFinite(row.score) ? Number(row.score) : 0),
        0
      );

      maxScore = sec.rows.reduce(
        (sum, row) => sum + (Number(row.maxScore) || 0),
        0
      );

      return {
        section: sec.section,
        score,
        maxScore,
      };
    });

    overallScore = adjustedOverallScore;
    var footNote = "";
  }

  const marketReadinessBand = getMarketReadinessBand(overallScore);
  const outOfRange = [];

  sections.forEach((sec) => {
    sec.rows.forEach((row) => {
      if (row.outOfRange) {
        outOfRange.push({
          indicator: row.name,
          message: row.outOfRange,
        });
      }
    });
  });

  /* ---------------- FINAL RESPONSE ---------------- */

  return {
    version: "v1",
    computedAt: new Date(),
    year,
    sections, // table
    sectionScores, // doughnut charts
    overallScore, // overall doughnut
    overallMaxScore, // 👈 IMPORTANT for frontend
    marketReadinessBand,
    outOfRange,
    footNote: footNote ? footNote : "",
  };
}

/* ====================== RUNNER ====================== */
async function runBatch() {
  const { yearIdMap, ledgerIndex, ledgerDocs } = await preloadData();
  // console.log("🧪 RUNNING IN SINGLE-RECORD DEBUG MODE");
  console.log(`🚀 Processing ${ledgerDocs.length} records`);

  let bulkOps = [];
  let updated = 0;

  for (const doc of ledgerDocs) {
    // const score = await computeMarketReadinessScoreFast(
    //   "5e0b2190f0d3fc6ffa3d94a8",
    //   "2021-22",
    //   yearIdMap,
    //   ledgerIndex
    // );
    const score = await computeMarketReadinessScoreFast(
      doc.ulb_id,
      doc.year,
      yearIdMap,
      ledgerIndex
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
