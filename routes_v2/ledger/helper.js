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
  lineItems: ["200", "210", "220", "230", "250","260","271"],
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
export default {
  totRevenue,
  totRevenueExpenditure,
  totOwnRevenue,
  totDebt,
  grants,
  totAssets,
  OperSurplusTotRevenueExpenditure,
  formatToCrore,
  getYearData,
  getLineItemDataByYear,
  getFormattedYearData,
  getFormattedLineItemDataByYear,
  getYearGrowth,
  getFormattedLineItemSumByYear

};
