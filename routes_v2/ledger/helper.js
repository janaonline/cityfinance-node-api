const totRevenue = {
  name: "Total Revenue",
  key: "totRevenue",
  lineItems: [
    "100",
    "110",
    "120",
    "130",
    "140",
    "150",
    "160",
    "170",
    "171",
    "180",
  ],
};

const totRevenueExpenditure = {
  name: "Total Revenue Expenditure",
  key: "totRevenueExpenditure",
  lineItems: [
    "200",
    "210",
    "220",
    "230",
    "240",
    "250",
    "260",
    "270",
    "271",
    "272",
    "280",
    "290",
  ],
};

const totOwnRevenue = {
  name: "Total Own Revenue",
  key: "totOwnRevenue",
  lineItems: ["110", "130", "140", "150", "170", "171", "180"],
};

const totDebt = {
  name: "Total Debt",
  key: "totDebt",
  lineItems: ["330", "331"],
};

const grants = {
  name: "Grants",
  key: "grants",
  lineItems: ["160"],
};

const totAssets = {
  name: "Total Balance Sheet Size",
  key: "totAssets",
  lineItems: [
    "400",
    "410",
    "411",
    "412",
    "420",
    "421",
    "430",
    "431",
    "432",
    "440",
    "450",
    "460",
    "470",
    "480",
  ],
};

const OperSurplusTotRevenueExpenditure = {
  name: "Operating Surplus",
  key: "OperSurplusTotRevenueExpenditure",
  lineItems: ["200", "210", "220", "230", "250", "260", "271"],
};
// Normalize values: "N/A", null/undefined, non-numeric -> null, else Number
const normalize = (val) => {
  if (val === "N/A" || val == null) return null;
  const num = parseFloat(val);
  return Number.isFinite(num) ? num : null;
};

// Safe division: returns a Number or null (if invalid or divide-by-zero)
const safeDivide = (numerator, denominator) => {
  const num = normalize(numerator);
  const den = normalize(denominator);
  if (num === null || den === null || den === 0) return null;
  return num / den;
};

// Percentage helper: returns Number (xx.xx) or "N/A"
const safePercent = (numerator, denominator, decimals = 2) => {
  const ratio = safeDivide(numerator, denominator);
  return ratio === null ? "N/A" : parseFloat((ratio * 100).toFixed(decimals));
};

// Ratio helper (no *100): returns Number or "N/A"
const safeRatio = (numerator, denominator, decimals = 2) => {
  const ratio = safeDivide(numerator, denominator);
  return ratio === null ? "N/A" : parseFloat(ratio.toFixed(decimals));
};
const getYearArray = (yearStr) => {
  // split input e.g. "2022-23" → ["2022", "23"]
  const [startStr, endStr] = yearStr.split("-");

  const startYear = parseInt(startStr); // 2022
  const endYear = parseInt("20" + endStr); // handle "23" → 2023

  // previous year
  const prevStart = startYear - 1;
  const prevEnd = endYear - 1;

  const prevYearStr = `${prevStart}-${String(prevEnd).slice(-2)}`;

  return [yearStr, prevYearStr];
};
const convertLedgerData = (data) => {
  return data.map((item) => {
    const convertedItem = {};
    for (let key in item) {
      convertedItem[key] = item[key] === 0 ? "N/A" : item[key]; // If value is 0, replace with 'N/A'
    }
    return convertedItem;
  });
};

const formatToCrore = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  // Convert to crore
  const croreVal = value / 1e7;
  // Format with 2 decimals + commas (Indian numbering system)
  return croreVal.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
const getYearData = (indicators, years, key) => {
  return years.map((year) => {
    const entry = indicators.find((ind) => ind.year === year);
    return entry?.indicators?.[key] ?? "N/A";
  });
};
const getLineItemDataByYear = (indicators, years, key, formatter) => {
  return years.map((year) => {
    const entry = indicators.find((ind) => ind.year === year);
    return entry?.lineItems?.[key] ?? "N/A";
  });
};
const getFormattedYearData = (indicators, years, key, formatter) => {
  return years.map((year) => {
    const entry = indicators.find((ind) => ind.year === year);
    const value = entry?.indicators?.[key] ?? "N/A";
    return formatter(value);
  });
};
const getFormattedLineItemDataByYear = (indicators, years, key, formatter) => {
  return years.map((year) => {
    const entry = indicators.find((ind) => ind.year === year);
    const value = entry?.lineItems?.[key] ?? "N/A";
    return formatter(value);
  });
};
const getYearGrowth = (indicators, years, key) => {
  return years.map((year, index) => {
    if (index === 0) return "";

    const prevYear = years[index - 1];
    const prevEntry = indicators.find((ind) => ind.year === prevYear);
    const currEntry = indicators.find((ind) => ind.year === year);

    const prevValue = prevEntry?.indicators?.[key] ?? 0;
    const currValue = currEntry?.indicators?.[key] ?? 0;

    if (!prevValue || !currValue) return "";

    const growth = ((currValue - prevValue) / prevValue) * 100;
    return growth > 0 ? `+${Math.round(growth)}` : `${Math.round(growth)}`;
  });
};
const getFormattedLineItemSumByYear = (indicators, years, keys, formatter) => {
  return years.map((year) => {
    const entry = indicators.find((ind) => ind.year === year);
    if (!entry) return "N/A";

    const values = keys.map((k) => entry?.lineItems?.[k]);

    if (values.every((v) => v == null)) return "N/A";

    const total = values.reduce((acc, v) => acc + (v ?? 0), 0);
    return formatter(total);
  });
};
const sumLineItemsCapex = (lineItems = {}) => {
  if (!lineItems) return null; // no line items at all → invalid

  const KEYS = ["410", "411", "412"];
  let total = 0;
  let hasAny = false;

  for (const k of KEYS) {
    const n = Number(lineItems[k]);
    if (Number.isFinite(n)) {
      total += n;
      hasAny = true; // at least one valid number present
    }
  }
  return hasAny ? total : null; // if none present → invalid
};

const startYearFromFY = (fy) => {
  const m = /^(\d{4})-/.exec(fy || "");
  return m ? parseInt(m[1], 10) : -Infinity;
};
const computeDeltaCapex = (rows) => {
  // console.log("computeDeltaCapex:", rows);
  if (!Array.isArray(rows) || rows.length < 2) return "N/A";

  const normalized = rows
    .map((r) => {
      const total = sumLineItemsCapex(r.lineItems);
      return {
        year: r.year,
        startYear: startYearFromFY(r.year),
        total, // can be number or null
      };
    })
    // keep only rows that have a valid year AND a valid total
    .filter((x) => Number.isFinite(x.startYear) && Number.isFinite(x.total));

  // console.log("Normalized Data:", normalized);
  // Need two valid years to compute delta
  if (normalized.length < 2) return "N/A";

  // Sort by start year, pick oldest as previous and newest as current
  normalized.sort((a, b) => a.startYear - b.startYear);
  const previous = normalized[0];
  const current = normalized[normalized.length - 1];

  if (current.startYear === previous.startYear) return "N/A";

  return current.total - previous.total;
};

const getInfoHTML = (indicator) => {
  const content = {
    totExpenditureByTotRevenue: `
      <h1>What is Total Expenditure to Total Revenue?</h1>
      <p>It indicates the extent of a ULG's spending against its total receipts.</p>
      <p>A higher ratio (&gt;100%) indicates the ULG is spending more than it earns. A lower ratio (&lt;100%) reflects a surplus.</p>

      <h2>How is it calculated?</h2>
      <p><strong>Total Expenditure over Total Receipts</strong></p>
      
      <h3>Total Expenditure</h3>
      <p>Total Expenditure is the sum of Capital Expenditure and Revenue Expenditure.</p>

      <h4>Revenue Expenditure</h4>
      <p>Revenue expenditure is the sum of the following:</p>
      <ul>
          <li>Establishment Expenditure</li>
          <li>Administrative Expenditure</li>
          <li>O&M Expenditure</li>
          <li>Interest and Finance Charges</li>
          <li>Other 8 line items</li>
      </ul>

      <h4>Capital Expenditure</h4>
      <p>Capital Expenditure is the sum of the following:</p>
      <ul>
          <li>Net Block (Gross Block + Accumulated Depreciation (negative figures))</li>
          <li>Capital Work in Progress</li>
      </ul>

      <h3>Total Receipts</h3>
      <p>Total Receipts is the sum of:</p>
      <ul>
          <li>Own Source Revenue</li>
          <li>Assigned Revenue</li>
          <li>Revenue Grants</li>
          <li>Others</li>
      </ul>

      <h3>Capital Receipts</h3>
      <p>Capital Receipts is the sum of:</p>
      <ul>
          <li>Debt Income (Secured and Unsecured Loans)</li>
          <li>Non-Debt Income (Capital Grants and Sale of fixed assets)</li>
      </ul>
    `,
    totOwnRevenueByTotRevenue: `<h1>What is Own Source Revenue to Total Revenue?</h1>
<p>It indicates the extent to which a ULG's revenue is generated from its own source revenues (such as property tax, rental income from municipal properties, fees and user charges, etc.) against total revenue receipts.</p>

<p>A higher ratio (above 50%) is desirable indicating greater self-reliance and reduced dependence on revenue grants and assigned revenues.</p>

<h2>How is it calculated?</h2>
<p><strong>Own Source Revenue over Total Revenue Receipts</strong></p>

<h3>Own Source Revenue</h3>
<p>Own Source Revenue is the sum of:</p>
<ul>
  <li>Tax Revenue</li>
  <li>Rental Income</li>
  <li>Fee & User Charges</li>
  <li>Sale & Hire Charges</li>
  <li>Interest Earned</li>
  <li>Income from Investment</li>
  <li>Other Income</li>
</ul>

<h3>Total Revenue Receipts</h3>
<p>Total Revenue Receipts is the sum of:</p>
<ul>
  <li>Own Source Revenue</li>
  <li>Assigned Revenue</li>
  <li>Revenue Grants</li>
  <li>Others</li>
</ul>
`,
    grantsByTotRevenue: `<h1>Revenue Grants over Total Revenue Receipts</h1>

<h2>Total Revenue Receipts</h2>
<p>Total Revenue Receipts is the sum of:</p>
<ul>
  <li>Own Source Revenue</li>
  <li>Assigned Revenue</li>
  <li>Revenue Grants</li>
  <li>Others</li>
</ul>
`,
  };

  return content[indicator] || ""; // Return empty string if not found
};

export default {
  normalize,
  safeDivide,
  safePercent,
  safeRatio,
  totRevenue,
  totRevenueExpenditure,
  totOwnRevenue,
  totDebt,
  grants,
  totAssets,
  getYearArray,
  sumLineItemsCapex,
  startYearFromFY,
  computeDeltaCapex,
  OperSurplusTotRevenueExpenditure,
  convertLedgerData,
  formatToCrore,
  getYearData,
  getLineItemDataByYear,
  getFormattedYearData,
  getFormattedLineItemDataByYear,
  getYearGrowth,
  getFormattedLineItemSumByYear,
  getInfoHTML,
};
