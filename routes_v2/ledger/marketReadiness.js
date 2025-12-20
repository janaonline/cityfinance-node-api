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
  "Dadra and Nagar Haveli",
  "Jammu and Kashmir",
  "NCT Delhi",
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
    console.log("Ledger Logs:", ledgerLogs);
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
    console.log("Property Tax Data:", propertyTaxData);
    const currYearKey = String(currentYearId);
    const prevYearKey = String(prevYearId);
    const pTaxMap = mapPTaxData(propertyTaxData);
    console.log("PTax Map:", pTaxMap);
    // 1️⃣ PTax Total Demand YoY (1.9)
    const pTaxDemandGrowth = calculateYoY(
      pTaxMap["1.9"]?.[currYearKey],
      pTaxMap["1.9"]?.[prevYearKey]
    );

    // 2️⃣ PTax Total Collection YoY (1.17)
    const pTaxCollectionGrowth = calculateYoY(
      pTaxMap["1.17"]?.[currYearKey],
      pTaxMap["1.17"]?.[prevYear]
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
    console.log("PTax Metrics:", {
      pTaxDemandGrowth,
      pTaxCollectionGrowth,
      pTaxCurrentCollectionEfficiency,
      pTaxArrearsCollectionEfficiency,
    });
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
    console.log("Operating Surplus %:", operatingSurplusPercent);
    /* ---------------- SECTIONS ---------------- */

    const sections = [
      {
        section: "REVENUE GENERATION (40%)",
        description:
          "Measures the growth, composition and efficiency of revenue income sources",
        rows: [
          {
            name: "Own Source Revenue to Total Revenue Receipts",
            maxScore: 4,
            score: getIndicatorScore(
              "OSR_TO_REVENUE",
              currentIndicators?.totOwnRevenueByTotRevenue
            ),
          },
          {
            name: "Y-o-Y Growth in Own Source Revenue",
            maxScore: 4,
            score: getIndicatorScore("OSR_GROWTH", growthOSR),
          },
          {
            name: "Revenue Grants to Total Revenue Receipts",
            maxScore: 4,
            score: getIndicatorScore(
              "GRANTS_TO_REVENUE",
              currentIndicators?.grantsByTotRevenue
            ),
          },
          {
            name: "Y-o-Y Growth in Total Revenue receipts",
            maxScore: 4,
            score: getIndicatorScore("TR_GROWTH", growthTotalRevenue),
          },
          {
            name: "Adjustments to TR (TR-Net Receivables) as % of TR",
            maxScore: 8,
            score: getIndicatorScore("TR_Net", adjustedTRPercent),
          },
          {
            name: "Y-o-Y Growth in Property tax total demand",
            maxScore: 4,
            score: getIndicatorScore("PTAX_DEMAND_GROWTH", pTaxDemandGrowth),
          },
          {
            name: "Y-o-Y Growth in Property tax total collections",
            maxScore: 4,
            score: getIndicatorScore(
              "PTAX_COLLECTION_GROWTH",
              pTaxCollectionGrowth
            ),
          },
          {
            name: "Property tax current collection efficiency",
            maxScore: 4,
            score: getIndicatorScore(
              "PTAX_CURRENT_COLLECTION_EFFICIENCY",
              pTaxCurrentCollectionEfficiency
            ),
          },
          {
            name: "Property tax average arrear collection efficiency",
            maxScore: 4,
            score: getIndicatorScore(
              "PTAX_ARREARS_COLLECTION_EFFICIENCY",
              pTaxArrearsCollectionEfficiency
            ),
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
            score: getIndicatorScore("FIX_CHARGES", fixedChargesByRevExp),
          },
          {
            name: "O&M Expenditure to Revenue Expenditure",
            maxScore: 4,
            score: getIndicatorScore("O&M_EXP", omByRevExpPercent),
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
            score: getIndicatorScore(
              "OPERATING_SURPLUS",
              operatingSurplusPercent
            ),
          },
          {
            name: "Quick Ratio",
            maxScore: 10,
            score: getIndicatorScore("QA_RATIO", currentIndicators?.qaRatio),
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
            score: getIndicatorScore(
              "TOT_DEBT_OWN_REV",
              currentIndicators?.totDebtByTotOwnRevenue
            ),
          },
          {
            name: "Debt Service Coverage Ratio (DSCR)**",
            maxScore: 8,
            score: "N/A",
          },
          {
            name: "Interest Service Coverage Ratio (ISCR)",
            maxScore: 4,
            score: getIndicatorScore(
              "ISCR_RATIO",
              currentIndicators?.iscrRatio
            ),
          },
        ],
      },
    ];

    /* ---------------- SECTION & OVERALL SCORES ---------------- */

    const sectionScores = sections.map((sec) => {
      const score = sec.rows.reduce(
        (sum, row) => sum + (Number(row.score) || 0),
        0
      );

      const maxScore = sec.rows.reduce(
        (sum, row) => sum + (Number(row.maxScore) || 0),
        0
      );

      return {
        section: sec.section,
        score,
        maxScore,
      };
    });

    const overallScore = sectionScores.reduce((sum, s) => sum + s.score, 0);

    const overallMaxScore = sectionScores.reduce(
      (sum, s) => sum + s.maxScore,
      0
    );
    const marketReadinessBand = getMarketReadinessBand(overallScore);

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

function getIndicatorScore(indicatorKey, value) {
  if (value === null || value === undefined || isNaN(value)) return 0;

  switch (indicatorKey) {
    case "OSR_TO_REVENUE":
      if (value > 50) return 4;
      if (value > 30) return 3;
      if (value > 20) return 2;
      return 1;

    case "OSR_GROWTH":
    case "TR_GROWTH":
      if (value > 15) return 4;
      if (value > 10) return 3;
      if (value > 5) return 2;
      return 1;

    case "GRANTS_TO_REVENUE":
      if (value < 30) return 4;
      if (value <= 50) return 3;
      if (value <= 70) return 2;
      return 1;
    case "TR_Net":
      if (value > 70) return 8;
      if (value > 50) return 6;
      if (value > 30) return 4;
      return 2;
    case "PTAX_DEMAND_GROWTH":
    case "PTAX_COLLECTION_GROWTH":
      if (value > 15) return 4;
      if (value > 10) return 3;
      if (value > 5) return 2;
      return 1;
    case "PTAX_CURRENT_COLLECTION_EFFICIENCY":
    case "PTAX_ARREARS_COLLECTION_EFFICIENCY":
      if (value > 60) return 4;
      if (value >= 40) return 3;
      if (value >= 20) return 2;
      return 1;
    case "FIX_CHARGES":
      if (value < 50) return 8;
      if (value <= 60) return 6;
      if (value <= 70) return 4;
      return 2;

    case "O&M_EXP":
      if (value < 30) return 4;
      if (value <= 40) return 3;
      if (value <= 50) return 2;
      return 1;
    case "OPERATING_SURPLUS":
      if (value > 30) return 10;
      if (value <= 30) return 7.5;
      if (value <= 20) return 5;
      return 2.5;
    case "QA_RATIO":
      if (value > 1) return 10;
      if (value >= 0.5) return 7.5;
      if (value >= 0.2) return 5;
      return 2.5;

    case "TOT_DEBT_OWN_REV":
      if (value < 10) return 8;
      if (value <= 20) return 6;
      if (value <= 30) return 4;
      return 2;

    case "ISCR_RATIO":
      if (value > 2) return 4;
      if (value >= 1.5) return 3;
      if (value >= 1) return 2;
      return 1;

    default:
      return 0;
  }
}
module.exports = {
  getAllStates,
  marketReadinessDataByUlb,
  getPreviousFinancialYear,
  // computeMarketReadinessScore,
  getAllUlbsMarketReadiness,
  getUlbSlugByName,
};
