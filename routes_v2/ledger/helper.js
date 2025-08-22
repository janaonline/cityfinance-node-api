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

// const capexpenditure = {
//   name: "Capital Expenditure",
//   key: "capex",
//   lineItems: ["410","411","412"]
// };

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
  if (typeof value !== "number") return "N/A";
  return (value / 1e7).toFixed(2); // Example: Convert to crore
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

export default {
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
};
