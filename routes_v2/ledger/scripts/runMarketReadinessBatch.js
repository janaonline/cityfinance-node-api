const mongoose = require("mongoose");
const ledgerLog = require("../../../models/LedgerLog");
const financialYear = require("../../../models/Year");
const propertyTax = require("../../../models/PropertyTaxOpMapper");
const h = require("./marketreadinessHelper");

let mrStatus = {
  isRunning: false,
  processed: 0,
  total: 0,
  startTime: null,
  error: null,
};

/**
 * CORE COMPUTE LOGIC
 */
/**
 * CORE COMPUTE LOGIC - Corrected for Debt
 */
async function computeMarketReadinessScoreFast(
  currentDoc,
  previousDoc,
  yearIdMap
) {
  const ulbId = currentDoc.ulb_id;
  const year = currentDoc.year;
  const prevYear = h.getPreviousFinancialYear(year);

  // If no previous year, we cannot calculate growth-based metrics
  if (!previousDoc) {
    return {
      version: "v1",
      computedAt: new Date(),
      status: "NO_PREVIOUS_YEAR",
      overallScore: 0,
      marketReadinessBand: "N/A",
    };
  }

  const ci = currentDoc.indicators || {};
  const pi = previousDoc.indicators || {};
  const li = currentDoc.lineItems || {};

  /* --- Math Calculations (OSR, TR, Property Tax) --- */
  const growthOSR = h.calculateYoYGrowth(ci.totOwnRevenue, pi.totOwnRevenue);
  const growthTR = h.calculateYoYGrowth(ci.totRevenue, pi.totRevenue);
  const netReceivables = (Number(li[431]) || 0) + (Number(li[432]) || 0);
  const adjustedTRPercent = h.percentageOf(
    Number(ci.totRevenue) - netReceivables,
    ci.totRevenue
  );
  const fixedCharges = (Number(li[210]) || 0) + (Number(li[220]) || 0);
  const fixedChargesByRevExp = h.percentageOf(
    fixedCharges,
    ci.totRevenueExpenditure
  );
  const omByRevExpPercent = h.percentageOf(
    Number(li[230]) || 0,
    ci.totRevenueExpenditure
  );

  /* --- Property Tax DB Lookup --- */
  const currYearId = yearIdMap[year];
  const prevYearId = yearIdMap[prevYear];
  const pTaxDocs = await propertyTax
    .find({
      ulb: new mongoose.Types.ObjectId(ulbId),
      year: {
        $in: [
          new mongoose.Types.ObjectId(currYearId),
          new mongoose.Types.ObjectId(prevYearId),
        ],
      },
      displayPriority: { $in: ["1.9", "1.17", "1.18", "1.10", "1.19", "1.11"] },
    })
    .lean();

  const pTaxMap = h.mapPTaxData(pTaxDocs);
  const pTaxDemandGrowth = h.calculateYoY(
    pTaxMap["1.9"]?.[currYearId],
    pTaxMap["1.9"]?.[prevYearId]
  );
  const pTaxCollectionGrowth = h.calculateYoY(
    pTaxMap["1.17"]?.[currYearId],
    pTaxMap["1.17"]?.[prevYearId]
  );
  const pTaxCurrentEff = h.calculatePercentage(
    pTaxMap["1.18"]?.[currYearId],
    pTaxMap["1.10"]?.[currYearId]
  );
  const pTaxArrearEff = h.calculatePercentage(
    pTaxMap["1.19"]?.[currYearId],
    pTaxMap["1.11"]?.[currYearId]
  );

  let operatingSurplusPercent =
    ci.totRevenue > 0
      ? Number(
          (
            ((ci.totRevenue - ci.OperSurplusTotRevenueExpenditure) /
              ci.totRevenue) *
            100
          ).toFixed(2)
        )
      : null;

  /* --- Mapping Scores using Helper --- */
  const indicators = {
    osr: h.getIndicatorScore(
      "OSR_TO_REVENUE",
      ci?.totOwnRevenueByTotRevenue,
      "OSR to Total Revenue"
    ),
    osrGrowth: h.getIndicatorScore("OSR_GROWTH", growthOSR, "OSR Growth"),
    grantsRatio: h.getIndicatorScore(
      "GRANTS_TO_REVENUE",
      ci?.grantsByTotRevenue,
      "Grants to Total Revenue"
    ),
    trGrowth: h.getIndicatorScore("TR_GROWTH", growthTR, "TR Growth"),
    trNet: h.getIndicatorScore(
      "TR_Net",
      adjustedTRPercent,
      "Adjustments to TR"
    ),
    pTaxDemand: h.getIndicatorScore(
      "PTAX_DEMAND_GROWTH",
      pTaxDemandGrowth,
      "PTax Demand Growth"
    ),
    pTaxCollection: h.getIndicatorScore(
      "PTAX_COLLECTION_GROWTH",
      pTaxCollectionGrowth,
      "PTax Collection Growth"
    ),
    pTaxCurrentEffs: h.getIndicatorScore(
      "PTAX_CURRENT_COLLECTION_EFFICIENCY",
      pTaxCurrentEff,
      "PTax Current Efficiency"
    ),
    pTaxArrearEffs: h.getIndicatorScore(
      "PTAX_ARREARS_COLLECTION_EFFICIENCY",
      pTaxArrearEff,
      "PTax Arrear Efficiency"
    ),
    fixedCharge: h.getIndicatorScore(
      "FIX_CHARGES",
      fixedChargesByRevExp,
      "Fixed Charges"
    ),
    omExp: h.getIndicatorScore("O&M_EXP", omByRevExpPercent, "O&M Expenditure"),
    operatingSurplus: h.getIndicatorScore(
      "OPERATING_SURPLUS",
      operatingSurplusPercent,
      "Operating Surplus"
    ),
    quickRatio: h.getIndicatorScore("QA_RATIO", ci?.qaRatio, "Quick Ratio"),
    iscr: h.getIndicatorScore("ISCR_RATIO", ci?.iscrRatio, "ISCR Ratio"),
    // CRITICAL: Extracting Debt Score
    rawDebt: h.getIndicatorScore(
      "TOT_DEBT_OWN_REV",
      ci?.totDebtByTotOwnRevenue,
      "Debt / Own Source Revenue"
    ),
  };

  // Determine if Debt is actually missing from the source
  // const isDebtMissing =
  //   ci?.totDebtByTotOwnRevenue === undefined ||
  //   ci?.totDebtByTotOwnRevenue === null;
  const debtCondition = !Number.isFinite(ci?.totDebt);
  const debtValue = ci?.totDebtByTotOwnRevenue;

  // const isDebtMissing = !Number.isFinite(ci?.totDebtByTotOwnRevenue);
  // console.log(isDebtMissing, "thi si s");
  const sections = [
    {
      section: "REVENUE GENERATION (40%)",
      rows: [
        {
          name: "OSR to Total Revenue",
          maxScore: 4,
          score: indicators.osr.score,
        },
        {
          name: "Y-o-Y Growth in OSR",
          maxScore: 4,
          score: indicators.osrGrowth.score,
        },
        {
          name: "Revenue Grants to Total Revenue",
          maxScore: 4,
          score: indicators.grantsRatio.score,
        },
        {
          name: "Y-o-Y Growth in TR",
          maxScore: 4,
          score: indicators.trGrowth.score,
        },
        {
          name: "Adjustments to TR (TR-Net Receivables)",
          maxScore: 8,
          score: indicators.trNet.score,
        },
        {
          name: "PTax Demand Growth",
          maxScore: 4,
          score: indicators.pTaxDemand.score,
        },
        {
          name: "PTax Collection Growth",
          maxScore: 4,
          score: indicators.pTaxCollection.score,
        },
        {
          name: "PTax Current Efficiency",
          maxScore: 4,
          score: indicators.pTaxCurrentEffs.score,
        },
        {
          name: "PTax Arrear Efficiency",
          maxScore: 4,
          score: indicators.pTaxArrearEffs.score,
        },
      ],
    },
    {
      section: "EXPENDITURE MANAGEMENT (20%)",
      rows: [
        {
          name: "Fixed Charges to Revenue Expenditure",
          maxScore: 8,
          score: indicators.fixedCharge.score,
        },
        {
          name: "O&M Exp to Revenue Expenditure",
          maxScore: 4,
          score: indicators.omExp.score,
        },
        {
          name: "Capital Utilization Ratio**",
          maxScore: 8,
          score: "N/A",
          excludeFromScore: true,
        },
      ],
    },
    {
      section: "CASH POSITION (20%)",
      rows: [
        {
          name: "Operating Surplus",
          maxScore: 10,
          score: indicators.operatingSurplus.score,
        },
        {
          name: "Quick Ratio",
          maxScore: 10,
          score: indicators.quickRatio.score,
        },
      ],
    },
    {
      section: "DEBT MANAGEMENT (20%)",
      rows: [
        // If missing, mark as derived for the frontend to handle grey-out
        {
          name: "Debt / Own Source Revenue",
          maxScore: 8,
          score: debtCondition ? "N/A" : indicators.rawDebt.score,
          derived: debtCondition,
        },
        { name: "DSCR**", maxScore: 8, score: "N/A" },
        {
          name: "Interest Service Coverage Ratio (ISCR)",
          maxScore: 4,
          score: debtCondition ? 0 : indicators.iscr.score,
        },
      ],
    },
  ];

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
  var topThreeScore = sectionScores
    .slice(0, 3)
    .reduce((acc, item) => acc + item.score, 0);
  var overallMaxScore = sectionScores.reduce((sum, s) => sum + s.maxScore, 0);
  if (debtCondition) {
    // console.log("inside");
    const adjustedOverallScore = Number(
      // (topThreeScore * (84 / 72) - (iscr?.score ?? 0)).toFixed(2)
      (topThreeScore)
      
    ); // console.log(adjustedOverallScore, "adjust score");
    if(debtValue=== "N/A") {
        var derivedDebtScore = 0;
      }else if(debtValue=== 0){
        var derivedDebtScore = 8;
      }
    // const derivedDebtScore = Number(
    //   (adjustedOverallScore - overallScore).toFixed(2)
    // );
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

  const marketReadinessBand = h.getMarketReadinessBand(overallScore);
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

/**
 * BACKGROUND PROCESSING
 */
async function startBackgroundBatch(batchSize = 500) {
  let cursor;

  try {
    const yearDocs = await financialYear
      .find()
      .select({ _id: 1, year: 1 })
      .lean();

    const yearIdMap = Object.fromEntries(
      yearDocs.map((y) => [y.year, String(y._id)])
    );

    const baseFilter = {
      ulb_id: { $exists: true, $ne: null },
      year: { $exists: true, $ne: null }
    };

    mrStatus.total = await ledgerLog.countDocuments(baseFilter);

    cursor = ledgerLog
      .find(baseFilter)
      .select({
        _id: 1,
        ulb_id: 1,
        year: 1,
        indicators: 1,
        lineItems: 1
      })
      .lean()
      .cursor({ batchSize });

    let bulkOps = [];

    for (
      let current = await cursor.next();
      current != null;
      current = await cursor.next()
    ) {
      try {
        const prevYear = h.getPreviousFinancialYear(current.year);

        const previous = await ledgerLog
          .findOne({
            ulb_id: current.ulb_id,
            year: prevYear
          })
          .select({
            _id: 1,
            ulb_id: 1,
            year: 1,
            indicators: 1,
            lineItems: 1
          })
          .lean();

        const score = await computeMarketReadinessScoreFast(
          current,
          previous,
          yearIdMap
        );

        bulkOps.push({
          updateOne: {
            filter: { _id: current._id },
            update: { $set: { marketReadinessScore: score } }
          }
        });

        if (bulkOps.length >= batchSize) {
          await ledgerLog.bulkWrite(bulkOps, { ordered: false });
          mrStatus.processed += bulkOps.length;
          bulkOps = [];
        }
      } catch (docErr) {
        console.error(
          `Batch error for doc=${current?._id} ulb=${current?.ulb_id} year=${current?.year}:`,
          docErr
        );
      }
    }

    if (bulkOps.length > 0) {
      await ledgerLog.bulkWrite(bulkOps, { ordered: false });
      mrStatus.processed += bulkOps.length;
    }
  } catch (err) {
    mrStatus.error = err.message;
    console.error("startBackgroundBatch failed:", err);
  } finally {
    if (cursor) {
      await cursor.close().catch(() => {});
    }
    mrStatus.isRunning = false;
  }
}

exports.runBatch = async (req, res) => {
  if (mrStatus.isRunning)
    return res.status(429).json({ message: "Job already running" });
  mrStatus = {
    isRunning: true,
    processed: 0,
    total: 0,
    startTime: new Date(),
    error: null,
  };
  startBackgroundBatch(parseInt(req.body.batchSize) || 500);
  res.status(202).json({ message: "Started" });
};

exports.getStatus = (req, res) => {
  res.json({
    ...mrStatus,
    percentage:
      mrStatus.total > 0
        ? ((mrStatus.processed / mrStatus.total) * 100).toFixed(2) + "%"
        : "0%",
  });
};
/**
 * TEST ROUTE: Process a single ULB and return the result immediately
 */
exports.runSingleUlb = async (req, res) => {
  const { ulbId, year } = req.body;

  if (!ulbId || !year) {
    return res
      .status(400)
      .json({ message: "ulbId and year are required in request body." });
  }

  try {
    // 1. Setup reference data
    const yearDocs = await financialYear
      .find()
      .select({ _id: 1, year: 1 })
      .lean();
    const yearIdMap = Object.fromEntries(
      yearDocs.map((y) => [y.year, String(y._id)])
    );

    // 2. Fetch the Current Year Record
    const current = await ledgerLog
      .findOne({
        ulb_id: new mongoose.Types.ObjectId(ulbId),
        year: year,
      })
      .select({ ulb_id: 1, year: 1, indicators: 1, lineItems: 1 })
      .lean();

    if (!current) {
      return res
        .status(404)
        .json({ message: `No data found for ULB ${ulbId} in year ${year}` });
    }

    // 3. Fetch the Previous Year Record
    const prevYearStr = h.getPreviousFinancialYear(year);
    const previous = await ledgerLog
      .findOne({
        ulb_id: new mongoose.Types.ObjectId(ulbId),
        year: prevYearStr,
      })
      .select({ indicators: 1 })
      .lean();

    // 4. Compute the score
    const score = await computeMarketReadinessScoreFast(
      current,
      previous,
      yearIdMap
    );

    // 5. Update the Database (Optional - remove if you only want to preview)
    await ledgerLog.updateOne(
      { _id: current._id },
      { $set: { marketReadinessScore: score } }
    );

    // 6. Return the full result so you can check the math
    return res.json({
      success: true,
      message: `Successfully computed and updated ULB ${ulbId} for ${year}`,
      data: score,
    });
  } catch (error) {
    console.error("Single ULB Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
