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
  const map = {};

  for (const d of data) {
    const key = d.displayPriority;
    const yearId = String(d.year);

    if (!map[key]) map[key] = {};
    map[key][yearId] = Number(d.value) || 0;
  }

  return map;
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

/* ====================== BAND LOGIC ====================== */

function getMarketReadinessBand(overallScore) {
  if (!Number.isFinite(overallScore)) return null;

  if (overallScore >= 65) return "A1 (Highly Prepared)";
  if (overallScore >= 50) return "A2 (Prepared)";
  if (overallScore >= 35) return "B (Moderately Prepared)";
  if (overallScore >= 20) return "C (Low Preparedness)";
  return "D (Very Low Preparedness)";
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
