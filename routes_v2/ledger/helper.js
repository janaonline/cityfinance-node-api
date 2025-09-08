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
  lineItems: ["200", "210", "220", "230", "250", "260","270","271","280","290"],
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
  const croreVal = (value / 1e7).toFixed(2);
  // Format with 2 decimals + commas (Indian numbering system)
  // return croreVal.toLocaleString("en-IN", {
  //   minimumFractionDigits: 2,
  //   maximumFractionDigits: 2,
  // });
  return croreVal
};
const formatToCroreSummary = (value) => {
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
  const mainDivClass = `class="text-dark custom-font-size-6"`;
  const questionClass = `class="text-start fw-bold mb-1"`;
  const answerClassOne = `class="text-start ps-4 mb-1"`;
  const listClass = `class="text-start ps-5"`;
  const childListClass = `class="text-start ps-5"`;

  const content = {
    totExpenditureByTotRevenue: `
<div ${mainDivClass}>
    <p ${questionClass}>1. What is Total Expenditure to Total Revenue?</p>
    <ul ${listClass}>
        <li>It indicates the extent of a ULG's spending against its total receipts.</li>
        <li>A higher ratio (&gt;100%) indicates the ULG is spending more than it earns. A lower ratio (&lt;100%) reflects a surplus.</li>
    </ul>

    <p ${questionClass}>2. How is it calculated?</p>
    <p ${answerClassOne}><strong>Total Expenditure over Total Receipt</strong></p>
    <p ${answerClassOne}><u>Total Expenditure</u> is the sum of Capital Expenditure and Revenue Expenditure.</p>
    <ul ${listClass}>
        <li>Capital Expenditure is the sum of the following:
            <ol ${childListClass}>
                <li>Net Block (Gross Block + Accumulated Depreciation (negative figures))</li>
                <li>Capital Work in Progress</li>
            </ol>
        </li>

        <li> Revenue expenditure is the sum of the following:
            <ol ${childListClass}>
                <li>Establishment Expenditure</li>
                <li>Administrative Expenditure</li>
                <li>O&M Expenditure</li>
                <li>Interest and Finance Charges</li>
                <li>Other 8 line items</li>
            </ol>
        </li>
    </ul>

    <p ${answerClassOne}><u>Total Receipts</u> is the sum of Capital Receipts and Revenue Receipts.</p>
    <ul ${listClass}>
        <li>Capital Receipts is the sum of:
            <ol ${childListClass}>
                <li>Debt Income (Secured and Unsecured Loans)</li>
                <li>Non-Debt Income (Capital Grants and Sale of fixed assets)</li>
            </ol>
        </li>
        <li>Revenue Receipts is the sum of:
            <ol ${childListClass}>
                <li>Own Source Revenue</li>
                <li>Assigned Revenue</li>
                <li>Revenue Grants</li>
                <li>Others</li>
            </ol>
        </li>
    </ul>
</div>
`,
    totOwnRevenueByTotRevenue: `
<div ${mainDivClass}>
    <p ${questionClass}>1. What is Own Source Revenue to Total Revenue?</p>
    <ul ${listClass}>
        <li>It indicates the extent to which a ULG's revenue is generated from its own source revenues (such as property tax, rental income from municipal properties, fees and user charges, etc.) against total revenue receipts.
        </li>
        <li>A higher ratio (above 50%) is desirable indicating greater self-reliance and reduced dependence on revenue grants and assigned revenues.</li>
    </ul>

    <p ${questionClass}>2. How is it calculated?</p>
    <p ${answerClassOne}><strong>Own Source Revenue over Total Revenue Receipts</strong></p>

    <p ${answerClassOne}><u>Own Source Revenue</u> is the sum of the following:</p>
    <ol ${childListClass}>
        <li>Tax Revenue</li>
        <li>Rental Income</li>
        <li>Fee &amp; User Charges</li>
        <li>Sale &amp; Hire Charges</li>
        <li>Interest Earned</li>
        <li>Income from Investment</li>
        <li>Other Income</li>
    </ol>

    <p ${answerClassOne}><u>Total Revenue Receipts</u> is the sum of the following:</p>
    <ol ${childListClass}>
        <li>Own Source Revenue</li>
        <li>Assigned Revenue</li>
        <li>Revenue Grants</li>
        <li>Others</li>
    </ol>
</div>
`,
    grantsByTotRevenue: `
<div ${mainDivClass}>
    <p ${questionClass}>1. What is Grants to Total Revenue?</p>
    <ul ${listClass}>
        <li>It indicates the extent to which a ULG's revenue is supplemented by revenue grants against total revenue receipts.</li>
        <li>A lower ratio is desirable indicating greater self-reliance and reduced dependence on revenue grants and assigned revenues.</li>
    </ul>

    <p ${questionClass}>2. How is it calculated?</p>
    <p ${answerClassOne}><strong>Revenue Grants over Total Revenue Receipts</strong></p>

    <p ${answerClassOne}><u>Total Revenue Receipts</u> is the sum of the following:</p>
    <ol ${childListClass}>
        <li>Own Source Revenue</li>
        <li>Assigned Revenue</li>
        <li>Revenue Grants</li>
        <li>Others</li>
    </ol>
</div>
`,
    totExpenditureByTotOwnRevenue: `
<div ${mainDivClass}>
    <p ${questionClass}>1. What is Own Source Revenue to Total Expenditure?</p>
    <ul ${listClass}>
        <li>It indicates the extent to which a ULG's total expenditure is covered by its own source revenues.</li>
        <li>A higher ratio is desirable indicating greater self-reliance with a higher share of expenditure being met from the ULG's own source revenue.</li>
    </ul>

    <p ${questionClass}>2. How is it calculated?</p>
    <p ${answerClassOne}><strong>Own Source Revenue over Total Expenditure</strong></p>

    <p ${answerClassOne}><u>Own Source Revenue</u> is the sum of:</p>
    <ol ${childListClass}>
        <li>Tax Revenue</li>
        <li>Rental Income</li>
        <li>Fee &amp; User Charges</li>
        <li>Sale &amp; Hire Charges</li>
        <li>Interest Earned</li>
        <li>Income from Investment</li>
        <li>Other Income</li>
    </ol>

    <p ${answerClassOne}><u>Total Expenditure</u> is the sum of Capital Expenditure and Revenue Expenditure.</p>
    <ul ${listClass}>
        <li>Revenue Expenditure is the sum of:
            <ol ${childListClass}>
                <li>Establishment Expenditure</li>
                <li>Administrative Expenditure</li>
                <li>O&M Expenditure</li>
                <li>Interest and Finance Charges</li>
                <li>Other line items (program expenses, depreciation, etc.)</li>
            </ol>
        </li>
        <li>Capital Expenditure is the sum of:
            <ol ${childListClass}>
                <li>Net Block (Gross Block + Accumulated Depreciation (negative figures))</li>
                <li>Capital Work in Progress</li>
            </ol>
        </li>
    </ul>
</div>
`,
    capitalExpenditureByTotExpenditure: `
<div ${mainDivClass}>
    <p ${questionClass}>1. What is Capital Expenditure to Total Expenditure?</p>
    <ul ${listClass}>
        <li>It indicates the extent to which ULG's expenditure is directed toward creating or upgrading long-term assets against the total expenditure.</li>
        <li>A higher ratio (above 50%) indicates higher focus on infrastructure creation and asset-building. A lower ratio indicates a stronger focus on recurring expenses.</li>
    </ul>

    <p ${questionClass}>2. How is it calculated?</p>
    <p ${answerClassOne}><strong>Capital Expenditure over Total Expenditure</strong></p>

    <p ${answerClassOne}><u>Total Expenditure</u> is the sum of Capital Expenditure and Revenue Expenditure.</p>
    <ul ${listClass}>
        <li>Revenue expenditure is the sum of:
            <ol ${childListClass}>
                <li>Establishment Expenditure</li>
                <li>Administrative Expenditure</li>
                <li>O&M Expenditure</li>
                <li>Interest and Finance Charges</li>
                <li>Other line items (program expenses, depreciation, etc.)</li>
            </ol>
        </li>
        <li>Capital Expenditure is the sum of:
            <ol ${childListClass}>
                <li>Net Block (Gross Block + Accumulated Depreciation (negative figures))</li>
                <li>Capital Work in Progress</li>
            </ol>
        </li>
    </ul>
</div>
`,
    operatingSurplus: `
<div ${mainDivClass}>
    <p ${questionClass}>1. What is the Operating Revenue Surplus?</p>
    <ul ${listClass}>
        <li>It indicates the available surplus/deficit generated from recurring revenue receipts and expenses.</li>
        <li>A higher surplus is desirable indicating greater available cashflows to service debt and invest in infrastructure development.</li>
    </ul>

    <p ${questionClass}>2. How is it calculated?</p>
    <p ${answerClassOne}><strong>Operating Revenue Surplus = Revenue Receipts - Revenue Expenditure (without interest and depreciation)</strong></p>
</div>
`,
    totRevenue: `
<div ${mainDivClass}>
    <p ${questionClass}>1. What is Total Revenue Receipts?</p>
    <ul ${listClass}>
        <li>It indicates the revenue receipts a ULG earns or receives from tax and non-tax sources including revenue grants and assigned revenues.</li>
    </ul>

    <p ${questionClass}>2. How is it calculated?</p>
    <p ${answerClassOne}><strong>Total Revenue Receipts is the sum of:</strong></p>
    <ol ${childListClass}>
        <li>Own Source Revenue</li>
        <li>Assigned Revenue</li>
        <li>Revenue Grants</li>
        <li>Others</li>
    </ol>
</div>
`,
    totOwnRevenue: `
<div ${mainDivClass}>
    <p ${questionClass}>1. What is Total Own Source Revenue?</p>
    <ul ${listClass}>
        <li>It indicates ULG's recurring receipts generated by its own sources.</li>
    </ul>

    <p ${questionClass}>2. How is it calculated?</p>
    <p ${answerClassOne}><u>Own Source Revenue</u> is the sum of:</p>
    <ol ${childListClass}>
        <li>Tax Revenue</li>
        <li>Rental Income</li>
        <li>Fee &amp; User Charges</li>
        <li>Sale &amp; Hire Charges</li>
        <li>Interest Earned</li>
        <li>Income from Investment</li>
        <li>Other Income</li>
    </ol>
</div>
`,
    totExpenditure: `
<div ${mainDivClass}>
    <p ${questionClass}>1. What is Total Expenditure?</p>
    <ul ${listClass}>
        <li>It indicates a ULG's total spending on capital expenditure and revenue expenditure.</li>
    </ul>

    <p ${questionClass}>2. How is it calculated?</p>
    <p ${answerClassOne}><strong>Total Expenditure = Capital Expenditure + Revenue Expenditure</strong></p>

    <ul ${listClass}>
        <li>Revenue expenditure is the sum of:
            <ol ${childListClass}>
                <li>Establishment Expenditure</li>
                <li>Administrative Expenditure</li>
                <li>O&M Expenditure</li>
                <li>Interest and Finance Charges</li>
                <li>Other line items (program expenses, depreciation, etc.)</li>
            </ol>
        </li>
        <li>Capital Expenditure is the sum of:
            <ol ${childListClass}>
                <li>Net Block (Gross Block + Accumulated Depreciation (negative figures))</li>
                <li>Capital Work in Progress</li>
            </ol>
        </li>
    </ul>
</div>
`,
    totRevenueExpenditure: `
<div ${mainDivClass}>
    <p ${questionClass}>1. What is Total Revenue Expenditure?</p>
    <ul ${listClass}>
        <li>It indicates a ULG's recurring expenses incurred on day-to-day functioning and operational needs.</li>
    </ul>

    <p ${questionClass}>2. How is it calculated?</p>
    <p ${answerClassOne}><u>Revenue Expenditure</u> is the sum of:</p>
    <ol ${childListClass}>
        <li>Establishment Expenditure</li>
        <li>Administrative Expenditure</li>
        <li>O&M Expenditure</li>
        <li>Interest and Finance Charges</li>
        <li>Other line items (program expenses, depreciation, etc.)</li>
    </ol>
</div>
`,
    totOwnRevenueByTotRevenueExpenditure: `
<div ${mainDivClass}>
    <p ${questionClass}>1. What is Own Source Revenue to Revenue Expenditure?</p>
    <ul ${listClass}>
        <li>It indicates the extent to which a ULG’s revenue expenditure is funded through its Own Source Revenue.</li>
        <li>A higher ratio is desirable indicating greater self-reliance. A lower ratio indicates dependence on revenue grants and assigned revenues to meet revenue expenditure.</li>
    </ul>

    <p ${questionClass}>2. How is it calculated?</p>
    <p ${answerClassOne}><strong>Own Source Revenue over Revenue Expenditure</strong></p>
    <p ${answerClassOne}><u>Own Source Revenue</u> is the sum of:</p>
    <ol ${childListClass}>
        <li>Tax Revenue</li>
        <li>Rental Income</li>
        <li>Fee & User Charges</li>
        <li>Sale & Hire Charges</li>
        <li>Interest Earned</li>
        <li>Income from Investment</li>
        <li>Other Income</li>
    </ol>

    <p ${answerClassOne}><u>Revenue expenditure</u> is the sum of:</p>
    <ol ${childListClass}>
        <li>Establishment Expenditure</li>
        <li>Administrative Expenditure</li>
        <li>O&M Expenditure</li>
        <li>Interest and Finance Charges</li>
        <li>Other line items, including program expenses, depreciation, etc.</li>
    </ol>
</div>
`,
    totDebt: `
<div ${mainDivClass}>
    <p ${questionClass}>1. What is Total Debt?</p>
    <ul ${listClass}>
        <li>It indicates a ULG's standalone debt obligations.</li>
    </ul>

    <p ${questionClass}>2. How is it calculated?</p>
    <p ${answerClassOne}><strong>Total Debt = Secured Loans + Unsecured Loans</strong></p>
</div>
`,
    totAssets: `
`,
    totDebtByTotAssets: `
<div ${mainDivClass}>
    <p ${questionClass}>1. What is Debt to Asset Ratio?</p>
    <ul ${listClass}>
        <li>It indicates a ULG's extent of debt against its balance sheet size.</li>
        <li>A higher ratio indicates the ULG being highly leveraged. A lower ratio indicates the ULG's potential to borrow more, subject to its needs.</li>
    </ul>

    <p ${questionClass}>2. How is it calculated?</p>
    <p ${answerClassOne}><strong>Total Debt over Total Assets</strong></p>

    <p ${answerClassOne}><u>Total Debt</u> is the sum of:</p>
    <ol ${childListClass}>
        <li>Secured Loans</li>
        <li>Unsecured Loans</li>
    </ol>

    <p ${answerClassOne}><u>Total Assets</u> is the sum of:</p>
    <ol ${childListClass}>
        <li>
         Fixed Assets
          <ol><u>Fixed Assets</u> is sum of:
            <li>Gross Block</li>
            <li>Accumulated Depreciation</li>
            <li>Capital WIP</li>
          </ol>
        </li>
        <li>
         Other Assets
          <ol><u>Other Assets</u> is sum of:
            <li>Investment - General Fund</li>
            <li>Investment - Other Funds</li>
            <li>Accumulated Provisions against Bad & Doubtful Receivables</li>
            <li>Other Assets</li>
            <li>Miscellanous Expenditure</li>
            <li>Others</li>
          </ol>
        </li>
        <li>
         Current Assets
          <ol><u>Current Assets</u> is sum of:
            <li>Stock in Hand</li>
            <li>Sundry Debtors</li>
            <li>Prepaid Expenses</li>
            <li>Cash & Bank Balance</li>
            <li>Loans, Advances & Deposits</li>
          </ol>
        </li>
    </ol>
</div>
`,
    totDebtByTotOwnRevenue: `
<div ${mainDivClass}>
    <p ${questionClass}>1. What is Debt-to-Own Source Revenue Ratio?</p>
    <ul ${listClass}>
        <li>It indicates a ULG's financial leverage relative to its internal revenue-generating capacity.</li>
        <li>A lower ratio is desirable indicating debt levels are manageable.</li>
    </ul>

    <p ${questionClass}>2. How is it calculated?</p>
    <p ${answerClassOne}><strong>Total Debt over Own Source Revenue</strong></p>

    <p ${answerClassOne}><u>Total Debt</u> is the sum of:</p>
    <ol ${childListClass}>
        <li>Secured Loans</li>
        <li>Unsecured Loans</li>
    </ol>

    <p ${answerClassOne}><u>Own Source Revenue</u> is the sum of:</p>
    <ol ${childListClass}>
        <li>Tax Revenue</li>
        <li>Rental Income</li>
        <li>Fee & User Charges</li>
        <li>Sale & Hire Charges</li>
        <li>Interest Earned</li>
        <li>Income from Investment</li>
        <li>Other Income</li>
    </ol>
</div>
`,
    iscrRatio: `
<div ${mainDivClass}>
    <p ${questionClass}>1. What is Interest Service Coverage Ratio?</p>
    <ul ${listClass}>
        <li>It indicates a ULG's capacity to make interest payments using its operating surplus.</li>
        <li>A higher ratio is desirable indicating better liquidity. A lower ratio indicates lower capacity to make interest payments.</li>
    </ul>

    <p ${questionClass}>2. How is it calculated?</p>
    <p ${answerClassOne}><strong>Operating Revenue Surplus over Interest and Finance Charges</strong></p>

    <p ${answerClassOne}><u>Operating Revenue Surplus</u> is calculated as: Revenue Receipts - Revenue Expenditure (excluding interest and finance charges, and depreciation)</p>
</div>
`,
    qaRatio: `
<div ${mainDivClass}>
    <p ${questionClass}>1. What is Quick Assets Ratio?</p>
    <ul ${listClass}>
        <li>It indicates a ULG's ability to meet its short-term recurring expenses with its available liquid assets.</li>
        <li>A higher ratio is desirable indicating better liquidity.</li>
    </ul>

    <p ${questionClass}>2. How is it calculated?</p>
    <p ${answerClassOne}><strong>Cash and Bank Balance and investments (general and other funds) over Revenue Expenditure prior to depreciation</strong></p>
</div>
`
  };

  return content[indicator] || ""; // Return empty string if not found
};

export default {
  normalize,
  formatToCroreSummary,
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
