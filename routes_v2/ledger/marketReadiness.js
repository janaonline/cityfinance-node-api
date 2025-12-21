const ledgerLog = require("../../models/LedgerLog");
const ulb = require("../../models/Ulb");
const financialYear = require("../../models/Year");
const propertyTax = require("../../models/PropertyTaxOpMapper");
const State = require("../../models/State");
const mongoose = require("mongoose");
const { Types } = mongoose;
const excludedStates = [
  "TEST STATE",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman & Diu",
  "Jammu and Kashmir",
  "The Government of NCT of Delhi",
  "Puducherry",
];
/* ====================== MAIN CONTROLLER ====================== */
async function getAllStates(req, res) {
  try {
    const states = await State.find({
      name: { $nin: excludedStates }, // ❌ exclude test state
    })
      .select({ _id: 1, name: 1 })
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({ states });
  } catch (error) {
    console.error("Get All States API Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
async function marketReadinessDataByUlb(req, res) {
  try {
    const { ulbId, year } = req.query;

    if (!ulbId || !year) {
      return res
        .status(400)
        .json({ message: "ulbId and year are required parameters." });
    }

    const ulbData = await ulb.findById(ulbId).lean();
    if (!ulbData) {
      return res.status(404).json({ message: "ULB not found." });
    }

    const prevYear = getPreviousFinancialYear(year);

    /* ---------------- FETCH LEDGER DATA ---------------- */
    const yearIds = await financialYear
      .find({ year: { $in: [year, prevYear] } })
      .select({ _id: 1, year: 1 })
      .lean();
    // console.log("Year IDs:", yearIds);
    if (yearIds.length < 2) {
      return res.status(404).json({
        message: "Financial year data not found for the specified years",
      });
    }
    const yearIdMap = {};
    yearIds.forEach((y) => {
      yearIdMap[y.year] = y._id;
    });

    const currentYearId = yearIdMap[year];
    const prevYearId = yearIdMap[prevYear];
    const ledgerLogs = await ledgerLog
      .find({
        ulb_id: ulbId,
        year: { $in: [year, prevYear] },
      })
      .select({
        indicators: 1,
        ulb_id: 1,
        year: 1,
        ulb: 1,
        _id: 0,
        lineItems: 1,
      })
      .lean();
    // console.log("Ledger Logs:", ledgerLogs);
    if (!ledgerLogs.length) {
      return res.status(404).json({
        message: "Ledger logs not found for the specified ULB and years",
      });
    }

    const ledgerByYear = {};
    ledgerLogs.forEach((log) => {
      ledgerByYear[log.year] = log;
    });

    const currentYearData = ledgerByYear[year] || {};
    const previousYearData = ledgerByYear[prevYear] || {};

    const currentIndicators = currentYearData.indicators || {};
    const previousIndicators = previousYearData.indicators || {};
    const lineItems = currentYearData.lineItems || {};

    /* ---------------- DERIVED METRICS ---------------- */

    const growthOSR = calculateYoYGrowth(
      currentIndicators?.totOwnRevenue,
      previousIndicators?.totOwnRevenue
    );

    const growthTotalRevenue = calculateYoYGrowth(
      currentIndicators?.totRevenue,
      previousIndicators?.totRevenue
    );

    const netReceivables =
      (Number(lineItems[431]) || 0) + (Number(lineItems[432]) || 0);

    const adjustedTRPercent = percentageOf(
      Number(currentIndicators?.totRevenue) - netReceivables,
      currentIndicators?.totRevenue
    );

    const fixedCharges =
      (Number(lineItems[210]) || 0) + (Number(lineItems[220]) || 0);

    const fixedChargesByRevExp = percentageOf(
      fixedCharges,
      currentIndicators?.totRevenueExpenditure
    );

    const omByRevExpPercent = percentageOf(
      Number(lineItems[230]) || 0,
      currentIndicators?.totRevenueExpenditure
    );

    const propertyTaxData = await propertyTax
      .find({
        ulb: new Types.ObjectId(ulbId),
        displayPriority: {
          $in: ["1.9", "1.17", "1.18", "1.10", "1.19", "1.11"],
        },
        year: { $in: [currentYearId, prevYearId] },
      })
      .select({
        displayPriority: 1,
        value: 1,
        year: 1,
        _id: 0,
      })
      .lean();
    // console.log("Property Tax Data:", propertyTaxData);
    const currYearKey = String(currentYearId);
    const prevYearKey = String(prevYearId);
    const pTaxMap = mapPTaxData(propertyTaxData);
    // console.log("PTax Map:", pTaxMap);
    // 1️⃣ PTax Total Demand YoY (1.9)
    const pTaxDemandGrowth = calculateYoY(
      pTaxMap["1.9"]?.[currYearKey],
      pTaxMap["1.9"]?.[prevYearKey]
    );

    // 2️⃣ PTax Total Collection YoY (1.17)
    const pTaxCollectionGrowth = calculateYoY(
      pTaxMap["1.17"]?.[currYearKey],
      pTaxMap["1.17"]?.[prevYearKey]
    );

    // 3️⃣ Current Collection Efficiency (1.18 / 1.10)
    const pTaxCurrentCollectionEfficiency = calculatePercentage(
      pTaxMap["1.18"]?.[currYearKey],
      pTaxMap["1.10"]?.[currYearKey]
    );

    // 4️⃣ Arrears Collection Efficiency (1.19 / 1.11)
    const pTaxArrearsCollectionEfficiency = calculatePercentage(
      pTaxMap["1.19"]?.[currYearKey],
      pTaxMap["1.11"]?.[currYearKey]
    );
    // console.log("PTax Metrics:", {
    //   pTaxDemandGrowth,
    //   pTaxCollectionGrowth,
    //   pTaxCurrentCollectionEfficiency,
    //   pTaxArrearsCollectionEfficiency,
    // });
    const totalRevenue = Number(currentIndicators?.totRevenue);
    const operSurplusRevExp = Number(
      currentIndicators?.OperSurplusTotRevenueExpenditure
    );

    let operatingSurplusPercent = null;

    if (
      Number.isFinite(totalRevenue) &&
      Number.isFinite(operSurplusRevExp) &&
      totalRevenue > 0
    ) {
      operatingSurplusPercent =
        ((totalRevenue - operSurplusRevExp) / totalRevenue) * 100;

      operatingSurplusPercent = Number(operatingSurplusPercent.toFixed(2));
    }
    // console.log("Operating Surplus %:", operatingSurplusPercent);
    /* ---------------- SECTIONS ---------------- */
    const rawDebtScore = getIndicatorScore(
      "TOT_DEBT_OWN_REV",
      currentIndicators?.totDebtByTotOwnRevenue,
      "Debt / Own Source Revenue"
    );

    const isDebtScoreMissing = !Number.isFinite(
      currentIndicators?.totDebtByTotOwnRevenue
    );
    /* ================= REVENUE GENERATION ================= */

    const osr = getIndicatorScore(
      "OSR_TO_REVENUE",
      currentIndicators?.totOwnRevenueByTotRevenue,
      "Own Source Revenue to Total Revenue Receipts"
    );

    const osrGrowth = getIndicatorScore(
      "OSR_GROWTH",
      growthOSR,
      "Y-o-Y Growth in Own Source Revenue"
    );

    const grantsRatio = getIndicatorScore(
      "GRANTS_TO_REVENUE",
      currentIndicators?.grantsByTotRevenue,
      "Revenue Grants to Total Revenue Receipts"
    );

    const trGrowth = getIndicatorScore(
      "TR_GROWTH",
      growthTotalRevenue,
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

    const pTaxCurrentEff = getIndicatorScore(
      "PTAX_CURRENT_COLLECTION_EFFICIENCY",
      pTaxCurrentCollectionEfficiency,
      "Property tax current collection efficiency"
    );

    const pTaxArrearEff = getIndicatorScore(
      "PTAX_ARREARS_COLLECTION_EFFICIENCY",
      pTaxArrearsCollectionEfficiency,
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

    const quickRatio = getIndicatorScore(
      "QA_RATIO",
      currentIndicators?.qaRatio,
      "Quick Ratio"
    );

    /* ================= DEBT ================= */

    const iscr = getIndicatorScore(
      "ISCR_RATIO",
      currentIndicators?.iscrRatio,
      "Interest Service Coverage Ratio (ISCR)"
    );

    // const sections = [
    //   {
    //     section: "REVENUE GENERATION (40%)",
    //     description:
    //       "Measures the growth, composition and efficiency of revenue income sources",
    //     rows: [
    //       {
    //         name: "Own Source Revenue to Total Revenue Receipts",
    //         maxScore: 4,
    //         score: getIndicatorScore(
    //           "OSR_TO_REVENUE",
    //           currentIndicators?.totOwnRevenueByTotRevenue,
    //           "Own Source Revenue to Total Revenue Receipts"
    //         ),
    //       },
    //       {
    //         name: "Y-o-Y Growth in Own Source Revenue",
    //         maxScore: 4,
    //         score: getIndicatorScore(
    //           "OSR_GROWTH",
    //           growthOSR,
    //           "Y-o-Y Growth in Own Source Revenue"
    //         ),
    //       },
    //       {
    //         name: "Revenue Grants to Total Revenue Receipts",
    //         maxScore: 4,
    //         score: getIndicatorScore(
    //           "GRANTS_TO_REVENUE",
    //           currentIndicators?.grantsByTotRevenue,
    //           "Revenue Grants to Total Revenue Receipts"
    //         ),
    //       },
    //       {
    //         name: "Y-o-Y Growth in Total Revenue receipts",
    //         maxScore: 4,
    //         score: getIndicatorScore(
    //           "TR_GROWTH",
    //           growthTotalRevenue,
    //           "Y-o-Y Growth in Total Revenue receipts"
    //         ),
    //       },
    //       {
    //         name: "Adjustments to TR (TR-Net Receivables) as % of TR",
    //         maxScore: 8,
    //         score: getIndicatorScore(
    //           "TR_Net",
    //           adjustedTRPercent,
    //           "Adjustments to TR (TR-Net Receivables) as % of TR"
    //         ),
    //       },
    //       {
    //         name: "Y-o-Y Growth in Property tax total demand",
    //         maxScore: 4,
    //         score: getIndicatorScore(
    //           "PTAX_DEMAND_GROWTH",
    //           pTaxDemandGrowth,
    //           "Y-o-Y Growth in Property tax total demand"
    //         ),
    //       },
    //       {
    //         name: "Y-o-Y Growth in Property tax total collections",
    //         maxScore: 4,
    //         score: getIndicatorScore(
    //           "PTAX_COLLECTION_GROWTH",
    //           pTaxCollectionGrowth,
    //           "Y-o-Y Growth in Property tax total collections"
    //         ),
    //       },
    //       {
    //         name: "Property tax current collection efficiency",
    //         maxScore: 4,
    //         score: getIndicatorScore(
    //           "PTAX_CURRENT_COLLECTION_EFFICIENCY",
    //           pTaxCurrentCollectionEfficiency,
    //           "Property tax current collection efficiency"
    //         ),
    //       },
    //       {
    //         name: "Property tax average arrear collection efficiency",
    //         maxScore: 4,
    //         score: getIndicatorScore(
    //           "PTAX_ARREARS_COLLECTION_EFFICIENCY",
    //           pTaxArrearsCollectionEfficiency,
    //           "Property tax average arrear collection efficiency"
    //         ),
    //       },
    //     ],
    //   },
    //   {
    //     section: "EXPENDITURE MANAGEMENT (20%)",
    //     description:
    //       "Measures revenue and capital expenditure components including overspending/underspending",
    //     rows: [
    //       {
    //         name: "Fixed Charges to Revenue Expenditure",
    //         maxScore: 8,
    //         score: getIndicatorScore(
    //           "FIX_CHARGES",
    //           fixedChargesByRevExp,
    //           "Fixed Charges to Revenue Expenditure"
    //         ),
    //       },
    //       {
    //         name: "O&M Expenditure to Revenue Expenditure",
    //         maxScore: 4,
    //         score: getIndicatorScore(
    //           "O&M_EXP",
    //           omByRevExpPercent,
    //           "O&M Expenditure to Revenue Expenditure"
    //         ),
    //       },
    //       {
    //         name: "Capital Utilization Ratio (Capital Expenditure / Capital Receipts)**",
    //         maxScore: 8,
    //         score: "N/A",
    //         excludeFromScore: true,
    //       },
    //     ],
    //   },
    //   {
    //     section: "CASH POSITION (20%)",
    //     description:
    //       "Measures capacity to borrow based on revenue surplus and liquidity position",
    //     rows: [
    //       {
    //         name: "Operating Surplus",
    //         maxScore: 10,
    //         score: getIndicatorScore(
    //           "OPERATING_SURPLUS",
    //           operatingSurplusPercent,
    //           "Operating Surplus"
    //         ),
    //       },
    //       {
    //         name: "Quick Ratio",
    //         maxScore: 10,
    //         score: getIndicatorScore(
    //           "QA_RATIO",
    //           currentIndicators?.qaRatio,
    //           "Quick Ratio"
    //         ),
    //       },
    //     ],
    //   },
    //   {
    //     section: "DEBT MANAGEMENT (20%)",
    //     description:
    //       "Measures debt levels against the operating receipts generated",
    //     rows: [
    //       {
    //         name: "Debt / Own Source Revenue",
    //         maxScore: 8,
    //         score: isDebtScoreMissing ? "N/A" : rawDebtScore,
    //         derived: isDebtScoreMissing,
    //       },
    //       {
    //         name: "Debt Service Coverage Ratio (DSCR)**",
    //         maxScore: 8,
    //         score: "N/A",
    //       },
    //       {
    //         name: "Interest Service Coverage Ratio (ISCR)",
    //         maxScore: 4,
    //         score: getIndicatorScore(
    //           "ISCR_RATIO",
    //           currentIndicators?.iscrRatio,
    //           "Interest Service Coverage Ratio (ISCR)"
    //         ),
    //       },
    //     ],
    //   },
    // ];
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
            score: pTaxCurrentEff.score,
            outOfRange: pTaxCurrentEff.outOfRange,
          },
          {
            name: "Property tax average arrear collection efficiency",
            maxScore: 4,
            score: pTaxArrearEff.score,
            outOfRange: pTaxArrearEff.outOfRange,
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
      const adjustedOverallScore = Number(
        (overallScore * (84 / 72)).toFixed(2)
      );

      const derivedDebtScore = Number(
        (adjustedOverallScore - overallScore).toFixed(2)
      );

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
      var footNote = `City ${ulbData.name} did not report debt for FY ${year}. For scoring comparability, the debt component has been derived through extrapolation. Please refer to the audited financial statements for detailed debt disclosures.`;
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

    return res.status(200).json({
      ulbId,
      ulbName: ulbData.name,
      year,
      sections, // table
      sectionScores, // doughnut charts
      overallScore, // overall doughnut
      overallMaxScore, // 👈 IMPORTANT for frontend
      marketReadinessBand,
      outOfRange,
      footNote: footNote ? footNote : "",
    });
  } catch (error) {
    console.error("Market Readiness API Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
async function getAllUlbsMarketReadiness(req, res) {
  try {
    const {
      page = 1,
      limit = 10,
      year,
      city,
      state,
      band,
      populationCategory,
      sortBy = "score",
      sortOrder = "desc",
    } = req.query;

    if (!year) {
      return res.status(400).json({ message: "year is required" });
    }

    const skip = (page - 1) * limit;
    const prevYear = getPreviousFinancialYear(year);

    /* ---------------- MATCH FILTERS ---------------- */
    const match = {
      year: { $in: [year, prevYear] },
      marketReadinessScore: { $exists: true },
    };

    if (state) match.state = state;
    if (city) match.ulb = { $regex: city, $options: "i" };
    if (band) match["marketReadinessScore.marketReadinessBand"] = band;

    if (populationCategory) {
      match.population = getPopulationRange(populationCategory);
    }

    /* ---------------- AGGREGATION ---------------- */
    const pipeline = [
      { $match: match },

      {
        $project: {
          ulb: 1,
          state: 1,
          population: 1,
          year: 1,
          score: "$marketReadinessScore.overallScore",
          band: "$marketReadinessScore.marketReadinessBand",
        },
      },

      {
        $group: {
          _id: "$ulb",
          city: { $first: "$ulb" },
          state: { $first: "$state" },
          population: { $first: "$population" },

          currScore: {
            $max: {
              $cond: [{ $eq: ["$year", year] }, "$score", null],
            },
          },
          prevScore: {
            $max: {
              $cond: [{ $eq: ["$year", prevYear] }, "$score", null],
            },
          },
          bandCurrYear: {
            $max: {
              $cond: [{ $eq: ["$year", year] }, "$band", null],
            },
          },
          bandPrevYear: {
            $max: {
              $cond: [{ $eq: ["$year", prevYear] }, "$band", null],
            },
          },
        },
      },

      {
        $addFields: {
          score: { $ifNull: ["$currScore", 0] },
          delta: {
            $cond: [
              { $and: ["$currScore", "$prevScore"] },
              { $subtract: ["$currScore", "$prevScore"] },
              0,
            ],
          },
          populationCategory: {
            $switch: {
              branches: [
                { case: { $gte: ["$population", 4000000] }, then: "4M+" },
                {
                  case: { $gte: ["$population", 1000000] },
                  then: "1M–4M",
                },
                {
                  case: { $gte: ["$population", 500000] },
                  then: "500K–1M",
                },
                {
                  case: { $gte: ["$population", 100000] },
                  then: "100K–500K",
                },
              ],
              default: "<100K",
            },
          },
        },
      },

      {
        $project: {
          _id: 0,
          city: 1,
          state: 1,
          populationCategory: 1,
          bandPrevYear: 1,
          bandCurrYear: 1,
          score: 1,
          delta: 1,
        },
      },

      {
        $sort: {
          [sortBy === "city" ? "city" : "score"]: sortOrder === "asc" ? 1 : -1,
        },
      },
      { $skip: skip },
      { $limit: Number(limit) },
    ];

    const data = await ledgerLog.aggregate(pipeline);

    const totalRecords = await ledgerLog
      .distinct("ulb", match)
      .then((r) => r.length);

    return res.status(200).json({
      page: Number(page),
      limit: Number(limit),
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit),
      data: data.map((row, i) => ({
        sno: skip + i + 1,
        ...row,
      })),
    });
  } catch (error) {
    console.error("Market Readiness Table API Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
async function getUlbSlugByName(req, res) {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ message: "ULB name is required" });
    }

    const ulbData = await ulb
      .findOne({
        name: { $regex: `^${name}$`, $options: "i" }, // case-insensitive exact match
      })
      .select({ _id: 1, name: 1, slug: 1 })
      .lean();

    if (!ulbData) {
      return res.status(404).json({ message: "ULB not found" });
    }

    return res.status(200).json({
      ulbId: ulbData._id,
      ulbName: ulbData.name,
      slug: ulbData.slug,
    });
  } catch (error) {
    console.error("Get ULB Slug Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

function getPopulationRange(category) {
  switch (category) {
    case "4M+":
      return { $gte: 4000000 };
    case "1M–4M":
      return { $gte: 1000000, $lt: 4000000 };
    case "500K–1M":
      return { $gte: 500000, $lt: 1000000 };
    case "100K–500K":
      return { $gte: 100000, $lt: 500000 };
    default:
      return {};
  }
}
/* ====================== HELPERS ====================== */
function getMarketReadinessBand(overallScore) {
  if (!Number.isFinite(overallScore)) return null;

  if (overallScore >= 65) return "A1 (Highly Prepared)";
  if (overallScore >= 56) return "A2 (Well Prepared)";
  if (overallScore >= 52) return "A3 (Moderately Prepared)";
  if (overallScore >= 47) return "B (Aspirational)";
  if (overallScore >= 40) return "C (Needs Intervention)";
  return "D (Low)";
}

function calculateYoY(curr, prev, decimals = 2) {
  const c = Number(curr);
  const p = Number(prev);
  // console.log("Calculating YoY:", { curr: c, prev: p });
  if (!Number.isFinite(c) || !Number.isFinite(p) || p === 0) return null;

  return Number((((c - p) / p) * 100).toFixed(decimals));
}
function calculatePercentage(numerator, denominator, decimals = 2) {
  const num = Number(numerator);
  const den = Number(denominator);

  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;

  return Number(((num / den) * 100).toFixed(decimals));
}
function mapPTaxData(data = []) {
  const map = {};

  data.forEach((d) => {
    const key = d.displayPriority;
    const yearId = String(d.year); // 🔑 normalize ObjectId

    if (!map[key]) {
      map[key] = {};
    }

    map[key][yearId] = Number(d.value) || 0;
  });

  return map;
}

function sumSectionScore(rows = []) {
  return rows.reduce((sum, r) => sum + (Number(r.score) || 0), 0);
}

function percentageOf(numerator, denominator, decimals = 2) {
  const num = Number(numerator);
  const den = Number(denominator);
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
  return Number(((num / den) * 100).toFixed(decimals));
}

function getPreviousFinancialYear(year) {
  const [startYear] = year.split("-");
  const prevStartYear = Number(startYear) - 1;
  const prevEndYear = String(startYear).slice(-2);
  return `${prevStartYear}-${prevEndYear}`;
}

function calculateYoYGrowth(currentValue, previousValue) {
  const current = Number(currentValue);
  const previous = Number(previousValue);
  // console.log("Calculating YoY Growth :", { current, previous });
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0)
    return null;
  return Number((((current - previous) / previous) * 100).toFixed(2));
}

/* ====================== SCORING RULES ====================== */

function getIndicatorScore(indicatorKey, value, label) {
  const result = {
    score: 0,
    outOfRange: null,
  };

  // ❌ invalid / negative / impossible values
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    result.score = 0;
    result.outOfRange = `Ratio ${label} exceeds the defined upper limit and is treated as out of range for scoring. Consequently, a score of 0 has been assigned for Ratio ${label}.`;
    return result;
  }

  switch (indicatorKey) {
    case "OSR_TO_REVENUE":
      result.score = value > 50 ? 4 : value > 30 ? 3 : value > 20 ? 2 : 1;
      break;

    case "OSR_GROWTH":
    case "TR_GROWTH":
      result.score = value > 15 ? 4 : value > 10 ? 3 : value > 5 ? 2 : 1;
      break;

    case "GRANTS_TO_REVENUE":
      result.score = value < 30 ? 4 : value <= 50 ? 3 : value <= 70 ? 2 : 1;
      break;

    case "TR_Net":
      result.score = value > 70 ? 8 : value > 50 ? 6 : value > 30 ? 4 : 2;
      break;

    case "PTAX_DEMAND_GROWTH":
    case "PTAX_COLLECTION_GROWTH":
      result.score = value > 15 ? 4 : value > 10 ? 3 : value > 5 ? 2 : 1;
      break;

    case "PTAX_CURRENT_COLLECTION_EFFICIENCY":
    case "PTAX_ARREARS_COLLECTION_EFFICIENCY":
      result.score = value > 60 ? 4 : value >= 40 ? 3 : value >= 20 ? 2 : 1;
      break;

    case "FIX_CHARGES":
      result.score = value < 50 ? 8 : value <= 60 ? 6 : value <= 70 ? 4 : 2;
      break;

    case "O&M_EXP":
      result.score = value < 30 ? 4 : value <= 40 ? 3 : value <= 50 ? 2 : 1;
      break;

    case "OPERATING_SURPLUS":
      result.score = value > 30 ? 10 : value > 20 ? 7.5 : value > 10 ? 5 : 2.5;
      break;

    case "QA_RATIO":
      result.score =
        value > 1 ? 10 : value >= 0.5 ? 7.5 : value >= 0.2 ? 5 : 2.5;
      break;

    case "TOT_DEBT_OWN_REV":
      if (value == null) {
        return { score: "N/A", outOfRange: null };
      }
      result.score = value < 10 ? 8 : value <= 20 ? 6 : value <= 30 ? 4 : 2;
      break;

    case "ISCR_RATIO":
      result.score = value > 2 ? 4 : value >= 1.5 ? 3 : value >= 1 ? 2 : 1;
      break;
  }

  return result;
}

module.exports = {
  getAllStates,
  marketReadinessDataByUlb,
  getPreviousFinancialYear,
  // computeMarketReadinessScore,
  getAllUlbsMarketReadiness,
  getUlbSlugByName,
};
