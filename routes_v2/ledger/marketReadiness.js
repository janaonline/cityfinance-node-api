const ledgerLog = require("../../models/LedgerLog");
const ulb = require("../../models/Ulb");

/* ====================== MAIN CONTROLLER ====================== */

module.exports = async function marketReadinessDataByUlb(req, res) {
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
            maxScore: 8,
            score: getIndicatorScore("O&M_EXP", omByRevExpPercent),
          },
        ],
      },
      {
        section: "CASH POSITION (20%)",
        description:
          "Measures capacity to borrow based on revenue surplus and liquidity position",
        rows: [
          {
            name: "Revenue Surplus to Revenue Receipts",
            maxScore: 8,
            score: getIndicatorScore("FIX_CHARGES", fixedChargesByRevExp),
          },
          {
            name: "Quick Ratio",
            maxScore: 8,
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
            name: "Interest Service Coverage Ratio (ISCR)",
            maxScore: 8,
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
      const score = sumSectionScore(sec.rows);

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

    /* ---------------- FINAL RESPONSE ---------------- */

    return res.status(200).json({
      ulbId,
      ulbName: ulbData.name,
      year,
      sections, // table
      sectionScores, // doughnut charts
      overallScore, // overall doughnut
      overallMaxScore, // 👈 IMPORTANT for frontend
    });
  } catch (error) {
    console.error("Market Readiness API Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ====================== HELPERS ====================== */

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
    case "TR_Net":
      if (value > 70) return 4;
      if (value > 50) return 3;
      if (value > 30) return 2;
      return 1;

    case "FIX_CHARGES":
      if (value > 70) return 4;
      if (value >= 60) return 3;
      if (value >= 50) return 2;
      return 1;

    case "O&M_EXP":
      if (value > 50) return 4;
      if (value >= 40) return 3;
      if (value >= 30) return 2;
      return 1;

    case "QA_RATIO":
      if (value > 1) return 4;
      if (value >= 0.5) return 3;
      if (value >= 0.2) return 2;
      return 1;

    case "TOT_DEBT_OWN_REV":
      if (value >= 30) return 4;
      if (value >= 20) return 3;
      if (value >= 10) return 2;
      return 1;

    case "ISCR_RATIO":
      if (value > 2) return 4;
      if (value >= 1.5) return 3;
      if (value >= 1) return 2;
      return 1;

    default:
      return 0;
  }
}
