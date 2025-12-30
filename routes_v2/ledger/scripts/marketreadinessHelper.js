/* ====================== YEAR HELPERS ====================== */

function getPreviousFinancialYear(year) {
  // "2019-20" -> "2018-19"
  if (!year || typeof year !== "string") return null;

  const [startYear] = year.split("-");
  const prevStartYear = Number(startYear) - 1;
  const prevEndYear = String(startYear).slice(-2);

  return `${prevStartYear}-${prevEndYear}`;
}

/* ====================== MATH HELPERS ====================== */

function calculateYoYGrowth(currentValue, previousValue, decimals = 2) {
  const current = Number(currentValue);
  const previous = Number(previousValue);

  if (
    !Number.isFinite(current) ||
    !Number.isFinite(previous) ||
    previous === 0
  ) {
    return null;
  }

  return Number((((current - previous) / previous) * 100).toFixed(decimals));
}

function calculateYoY(curr, prev, decimals = 2) {
  const c = Number(curr);
  const p = Number(prev);

  if (!Number.isFinite(c) || !Number.isFinite(p) || p === 0) return null;

  return Number((((c - p) / p) * 100).toFixed(decimals));
}

function calculatePercentage(numerator, denominator, decimals = 2) {
  const num = Number(numerator);
  const den = Number(denominator);

  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;

  return Number(((num / den) * 100).toFixed(decimals));
}

function percentageOf(numerator, denominator, decimals = 2) {
  return calculatePercentage(numerator, denominator, decimals);
}

/* ====================== PROPERTY TAX ====================== */

function mapPTaxData(data = []) {
  //   console.log("Data received for mapping:", data);
  const map = {};

  for (const d of data) {
    const key = d.displayPriority;
    const yearId = String(d.year);

    if (!map[key]) map[key] = {};
    map[key][yearId] = Number(d.value) || 0;
  }

  return map;
}
// function mapPTaxData(data = []) {
//   const map = {};

//   data.forEach((d) => {
//     const key = d.displayPriority;
//     const yearId = String(d.year); // 🔑 normalize ObjectId

//     if (!map[key]) {
//       map[key] = {};
//     }

//     map[key][yearId] = Number(d.value) || 0;
//   });

//   return map;
// }

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

/* ====================== BAND LOGIC ====================== */

function getMarketReadinessBand(overallScore) {
  if (!Number.isFinite(overallScore)) return null;

  if (overallScore >= 65) return "A1 (Highly Prepared)";
  if (overallScore >= 56) return "A2 (Well Prepared)";
  if (overallScore >= 52) return "A3 (Moderately Prepared)";
  if (overallScore >= 47) return "B (Aspirational)";
  if (overallScore >= 40) return "C (Needs Intervention)";
  return "D (Low)";
}

/* ====================== EXPORTS ====================== */

module.exports = {
  getPreviousFinancialYear,
  calculateYoYGrowth,
  calculateYoY,
  calculatePercentage,
  percentageOf,
  mapPTaxData,
  getIndicatorScore,
  getMarketReadinessBand,
};
