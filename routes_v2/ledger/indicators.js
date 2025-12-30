const ledgerLog = require("../../models/LedgerLog");
const ulb = require("../../models/Ulb");
const LineItem = require("../../models/LineItem");
const IndicatorsModel = require("../../models/ledgerIndicators");
const { getPopulationCategory } = require("../common/common");
const ALLOWED_COMPARE_TYPES = [
  "ulb",
  "state",
  "national",
  "popCat",
  "ulbType",
  "ulbs",
];
const {
  totRevenueArr,
  totOwnRevenueArr,
  revExpenditureArr,
  capexArr,
} = require("../utils/ledgerFormulas");
const ALLOWED_LINEITEMS = ["revenue", "ownRevenue", "revex", "capex"];
const ALLOWED_CALC_TYPES = ["total", "perCapita", "mix"];
const LINE_ITEMS_MAP = {
  revenue: totRevenueArr,
  ownRevenue: totOwnRevenueArr,
  revex: revExpenditureArr,
  capex: capexArr,
};
const LABEL_MAP = {
  ulb: "$ulbName",
  popCat: "Population category Avg",
  ulbType: "ULB Type Avg",
  state: "State Avg",
  national: "National Avg",
};
const OWN_REV = ["100", ...totOwnRevenueArr.map((e) => e.split(".")[1])];
const GRAPH_COLORS = [
  "#62b6cb",
  "#1b4965",
  "#bee9e8",
  "#43B5A0",
  "#F4A261",
  "#5885AF",
  "#F6D743",
  "#f43f5e",
  "#B388FF",
];
const LINE_COLOR = "#f43f5e";
const ROUND_UP = 0;
const {
  formatToCroreSummary,
  safeDivide,
  normalize,
  safePercent,
  safeRatio,
  totRevenue,
  totRevenueExpenditure,
  totOwnRevenue,
  totDebt,
  grants,
  getYearArray,
  totAssets,
  OperSurplusTotRevenueExpenditure,
  convertLedgerData,
  formatToCrore,
  getYearData,
  getLineItemDataByYear,
  getFormattedLineItemSumByYear,
  getFormattedYearData,
  getFormattedLineItemDataByYear,
  computeDeltaCapex,
  getYearGrowth,
  getInfoHTML,
  CompareBygroupIndicators,
} = require("./helper").default;
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
// Using ObjectId from mongoose
const { ObjectId } = mongoose.Types;

module.exports.getIndicators = async (req, res) => {
  try {
    const { ulbId, financialYear } = req.query;
    if (!ulbId || !financialYear) {
      return res.status(400).json({ message: "Missing required parameters" });
    }
    var ulbPopulation = await ulb
      .findOne({ _id: ObjectId(ulbId) })
      .select("population");
    // console.log("ulbPopulation:", ulbPopulation);
    if (!ulbPopulation) {
      return res.status(404).json({ message: "ULB not found" });
    }
    const allLineItems = await IndicatorsModel.find({})
      .select(["lineItems", "name", "key"])
      .lean();
    if (!allLineItems || allLineItems.length === 0) {
      return res.status(404).json({ message: "No Primary indicators found" });
    }
    const IndicatorTotals = await accumulateIndicators(
      ulbId,
      financialYear,
      allLineItems,
      ulbPopulation.population
    );

    res.status(200).json(IndicatorTotals);
  } catch (error) {
    console.error("Error fetching indicators:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

async function accumulateIndicators(
  ulbId,
  financialYear,
  allLineItems,
  ulbPopulation
) {
  try {
    const totals = await getCommonIndicatorsData({
      ulbId,
      financialYear,
      allLineItems,
    });
    // console.log("totals", totals);
    const marketDashboardInd = await marketDashboardIndicators(
      ulbId,
      financialYear,
      totals,
      ulbPopulation
    );
    const { intFinCha, qaRatioNum, depreciation, ...filteredTotals } =
      totals[0] || {};
    const mergedResult = {
      ...filteredTotals,
      ...marketDashboardInd,
    };
    // console.log("Merged Result:", mergedResult);

    const updatedDoc = await ledgerLog.findOneAndUpdate(
      { ulb_id: ObjectId(ulbId), year: financialYear },
      { $set: { indicators: mergedResult } }, // set entire "indicators" object
      { new: true, upsert: true } // create doc if doesn't exist
    );

    // console.log("Updated Document:", updatedDoc);
    return updatedDoc;
  } catch (error) {
    console.error("Error in accumulateIndicators:", error);
    throw error;
  }
}

async function getCommonIndicatorsData({ ulbId, financialYear, allLineItems }) {
  try {
    const addFields = [];
    const projection = {};
    const addedLineItems = [
      ...allLineItems,
      {
        lineItems: ["450", "420", "421"],
        name: "Qa Ratio num",
        key: "qaRatioNum",
      },
      {
        lineItems: ["272"],
        name: "Depreciation",
        key: "depreciation",
      },
      {
        lineItems: ["240"],
        name: "Interest and Finance Charges ",
        key: "intFinCha",
      },
    ];
    //  console.log(allLineItems,'this is all line items')
    for (const indicator of addedLineItems) {
      const fieldsToAdd = indicator.lineItems.map((lineItem) => ({
        $ifNull: [`$lineItems.${lineItem}`, 0],
      }));
      projection[indicator.key] = { $add: fieldsToAdd };
    }
    projection._id = 0;
    const aggregationPipeline = [
      {
        $match: {
          ulb_id: ObjectId(ulbId),
          year: financialYear,
        },
      },
      {
        $project: projection,
      },
    ];
    const ledgerData = await ledgerLog.aggregate(aggregationPipeline);
    //  console.log(ledgerData, "ledgerData");
    const ledgerDataChecked = convertLedgerData(ledgerData);
    return ledgerDataChecked;
  } catch (error) {
    console.error("Error in getCommonIndicatorsData:", error);
    throw error;
  }
}
/**
 * Calculates key market dashboard indicators from total financial data
 *
 * Formulas:
 * 1. Total Own Revenue by Total Revenue = totOwnRevenue / totRevenue
 * 2. Grants by Total Revenue = grants / totRevenue
 * 3. Total Own Revenue by Total Revenue Expenditure = totOwnRevenue / totRevenueExpenditure
 * 4. Total Debt by Total Assets = totDebt / totAssets
 * 5. Total Debt by Total Own Revenue = totDebt / totOwnRevenue
 * 6. iscrRatio = (totRevenue - OperSurplusTotRevenueExpenditure)/ intFinCha
   7. qaRatio = qaRatioNum/ (totRevenueExpenditure - depreciation)
 *
 * @param {Array} totals - Array of financial totals, typically with a single object
 * @returns {Object} marketDasInd - Calculated indicator values
 */
// const safeDivide = (numerator, denominator) => {
//   if (numerator === "N/A" || denominator === "N/A") return "N/A";
//   if (numerator == null || denominator == null) return "N/A";
//   if (denominator === 0) return 0;
//   return numerator / denominator;
// };

async function marketDashboardIndicators(
  ulbId,
  financialYear,
  totals,
  ulbPopulation
) {
  console.log("ulbPopulation in marketDashboardIndicators:", ulbPopulation);
  // ---- Guards & input validation ----
  if (!ulbId || (typeof ulbId !== "string" && !(ulbId instanceof ObjectId))) {
    throw new Error("Invalid ulbId");
  }
  if (!financialYear || typeof financialYear !== "string") {
    throw new Error("Invalid financialYear");
  }
  if (
    !Array.isArray(totals) ||
    totals.length === 0 ||
    typeof totals[0] !== "object"
  ) {
    throw new Error("Totals array is empty or invalid");
  }

  const marketDasInd = {};

  try {
    const {
      totRevenue,
      totRevenueExpenditure,
      totAssets,
      totOwnRevenue,
      totDebt,
      grants,
      OperSurplusTotRevenueExpenditure,
      intFinCha,
      qaRatioNum,
      depreciation,
    } = totals[0] || {};

    // ---------- Fetch capex (already returns a number or "N/A") ----------
    const capexRaw = await getCapexValue(ulbId, financialYear);
    const isNegative = typeof capexRaw === "number" && capexRaw < 0;
    marketDasInd.capex = capexRaw;
    marketDasInd.capexAdjusted = isNegative ? "N/A" : null;

    // ---------- Normalized numbers for downstream math ----------
    const rev = normalize(totRevenue);
    const operExp = normalize(OperSurplusTotRevenueExpenditure);
    const intFinChaVal = normalize(intFinCha);
    const qaRatioNumVal = normalize(qaRatioNum);
    const totRevExp = normalize(totRevenueExpenditure);
    const depreciationVal = normalize(depreciation);
    const capexVal = normalize(marketDasInd.capex);
    const capexisNeg = typeof capexVal === "number" && capexVal < 0;
    const capexFinal = capexisNeg ? null : capexVal;
    // console.log(capexVal, capexisNeg, capexFinal, "capex values");
    const ownRevVal = normalize(totOwnRevenue);
    const totAssetsVal = normalize(totAssets);
    const totDebtVal = normalize(totDebt);
    const grantsVal = normalize(grants);

    // ---------- Core metrics ----------
    // operatingSurplus = totRevenue - OperSurplusTotRevenueExpenditure (your existing logic)
    marketDasInd.operatingSurplus =
      rev !== null && operExp !== null ? rev - operExp : "N/A";

    // iscrRatio = (totRevenue - OperSurplusTotRevenueExpenditure) / intFinCha
    marketDasInd.iscrRatio =
      rev !== null &&
      operExp !== null &&
      intFinChaVal !== null &&
      intFinChaVal !== 0
        ? parseFloat(((rev - operExp) / intFinChaVal).toFixed(2))
        : "N/A";
    // console.log(qaRatioNumVal, totRevExp, depreciationVal, "qar");
    // qaRatio = qaRatioNum / (totRevenueExpenditure - depreciation)
    marketDasInd.qaRatio =
      qaRatioNumVal !== null &&
      totRevExp !== null &&
      // depreciationVal !== null && // removed this check to allow null depreciation
      totRevExp - depreciationVal !== 0
        ? parseFloat((qaRatioNumVal / (totRevExp - depreciationVal)).toFixed(2))
        : "N/A";

    // totExpenditure = totRevenueExpenditure + capex  (only if both valid)
    marketDasInd.totExpenditure =
      totRevExp !== null ? totRevExp + capexFinal : "N/A";

    // ---------- Ratios already in your code ----------
    marketDasInd.totOwnRevenueByTotRevenue = safePercent(
      totOwnRevenue,
      totRevenue
    );
    marketDasInd.grantsByTotRevenue = safePercent(grantsVal, totRevenue);
    marketDasInd.totOwnRevenueByTotRevenueExpenditure = safePercent(
      totOwnRevenue,
      totRevenueExpenditure
    );

    marketDasInd.totDebtByTotAssets = safeRatio(totDebtVal, totAssetsVal);
    marketDasInd.totDebtByTotOwnRevenue = safeRatio(totDebtVal, ownRevVal);

    // ---------- New ratios using safeDivide (return "N/A" if invalid) ----------
    marketDasInd.totExpenditureByTotRevenue =
      marketDasInd.totExpenditure !== "N/A" && rev !== null && rev !== 0
        ? parseFloat((marketDasInd.totExpenditure / rev) * 100).toFixed(2)
        : "N/A";

    marketDasInd.totExpenditureByTotOwnRevenue =
      marketDasInd.totExpenditure !== "N/A" &&
      ownRevVal !== null &&
      ownRevVal !== 0
        ? parseFloat((ownRevVal / marketDasInd.totExpenditure) * 100).toFixed(2)
        : "N/A";

    marketDasInd.capitalExpenditureByTotExpenditure =
      marketDasInd.totExpenditure !== "N/A" &&
      marketDasInd.totExpenditure !== 0 &&
      capexFinal !== null
        ? parseFloat((capexFinal / marketDasInd.totExpenditure) * 100).toFixed(
            2
          )
        : "N/A";
    // ---------- Return the computed indicators for per capita ----------
    marketDasInd.totRevenuePerCapita = safePerCapita(rev, ulbPopulation);
    marketDasInd.totRevenueExpenditurePerCapita = safePerCapita(
      totRevExp,
      ulbPopulation
    );
    marketDasInd.totOwnRevenuePerCapita = safePerCapita(
      ownRevVal,
      ulbPopulation
    );
    marketDasInd.totDebtPerCapita = safePerCapita(totDebtVal, ulbPopulation);
    marketDasInd.grantsPerCapita = safePerCapita(grantsVal, ulbPopulation);
    marketDasInd.totAssetsVal = safePerCapita(totAssetsVal, ulbPopulation);
    marketDasInd.operatingSurplusPerCapita = safePerCapita(
      marketDasInd.operatingSurplus,
      ulbPopulation
    );
    marketDasInd.totExpenditureCapita = safePerCapita(
      marketDasInd.totExpenditure,
      ulbPopulation
    );
    marketDasInd.capexPerCapita = safePerCapita(capexFinal, ulbPopulation);

    console.log(marketDasInd, "marketDasInd");
    return marketDasInd;
  } catch (error) {
    // Centralised error reporting (re-throw so caller can handle HTTP/status, etc.)
    console.error("Error in marketDashboardIndicators:", error);
    throw error;
  }
}
function safePerCapita(value, population, decimals = 2) {
  const num = toNumber(value);
  const pop = toNumber(population);

  if (pop <= 0) return 0;

  const result = num / pop;
  return Number(result.toFixed(decimals));
}
function toNumber(value) {
  if (value === null || value === undefined) return 0;

  if (typeof value === "string") {
    const cleaned = value.trim().toLowerCase();

    // Strings that mean "no data"
    if (["n/a", "na", "-", "--", ""].includes(cleaned)) {
      return 0;
    }

    // Remove commas (e.g., "12,345")
    const parsed = Number(cleaned.replace(/,/g, ""));
    return isNaN(parsed) ? 0 : parsed;
  }

  if (typeof value === "number") {
    return isNaN(value) ? 0 : value;
  }

  return 0;
}
const getCapexValue = async (ulbId, financialYear) => {
  if (!ulbId || ulbId.length === 0) return "N/A";

  const yearsArray = await getYearArray(financialYear); // e.g., ["2022-23","2021-22"]
  if (!Array.isArray(yearsArray) || yearsArray.length < 2) return "N/A";

  try {
    const ledgerData = await ledgerLog
      .find({ ulb_id: new ObjectId(ulbId), year: { $in: yearsArray } })
      .select("year lineItems.410 lineItems.411 lineItems.412")
      .lean();

    // Empty or single-year → N/A
    if (!Array.isArray(ledgerData) || ledgerData.length < 2) return "N/A";

    return computeDeltaCapex(ledgerData);
  } catch (err) {
    console.error("Error fetching ledgerData:", err);
    return "N/A";
  }
};
module.exports.createIndicators = async (req, res) => {
  try {
    // List of indicators you want to ensure are present
    const indicatorsList = [
      totRevenue,
      totRevenueExpenditure,
      totOwnRevenue,
      // capexpenditure,
      totDebt,
      grants,
      totAssets,
      OperSurplusTotRevenueExpenditure,
    ];

    const results = [];
    let modifiedCount = 0;

    for (const indicator of indicatorsList) {
      // console.log(indicator,'this is list');
      const result = await IndicatorsModel.updateOne(
        { key: indicator.key },
        { $set: indicator },
        { upsert: true }
      );

      results.push({ key: indicator.key, result });

      if (result.modifiedCount > 0 || result.upsertedCount > 0) {
        modifiedCount++;
      }
    }

    if (modifiedCount === 0) {
      return res.status(200).json({ message: "No changes occurred" });
    }

    res.status(200).json({
      message: `${modifiedCount} indicators inserted/updated successfully`,
      details: results,
    });
  } catch (error) {
    console.error("Error upserting indicators:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports.getCityDasboardIndicators = async (req, res) => {
  try {
    const { ulbId, years, keyType } = req.query;
    // console.log("ulbId:", ulbId, "years:", years);
    if (!ulbId || !years || !keyType) {
      return res.status(400).json({ message: "Missing required parameters" });
    }
    const indicators = await ledgerLog
      .find({ ulb_id: ObjectId(ulbId), year: { $in: years } })
      .select([
        "ulb_id",
        "audit_status",
        "year",
        "state",
        "ulb",
        "indicators",
        "lineItems",
      ])
      .lean();
    if (!indicators || indicators.length === 0) {
      return res.status(404).json({ message: "No indicators found" });
    }
    // console.log(indicators, "this is indicators");
    const header = {
      name: "Indicators",
      yearData: years,
      className: "fw-bold ",
      isHeader: true,
    };
    // console.log(header, "this is header");
    var params = indicators.map(({ lineItems, ...rest }) => rest);
    const source = buildSourceStatement(params);
    //  console.log(yearsArray,'this is source')
    var intro = await getIntro(params, keyType, years);
    switch (keyType) {
      case "overview": {
        var response = {
          intro: intro,
          data: [
            header,
            {
              name: "Total Revenue Receipts (Cr)",
              graphKey: "amount",
              isParent: "true",
              yearData: getFormattedYearData(
                indicators,
                years,
                "totRevenue",
                formatToCrore
              ),
              yearGrowth: getYearGrowth(indicators, years, "totRevenue"),
              info: getInfoHTML("totRevenue"),
              children: [
                {
                  name: "Own Source Revenue (Cr)",
                  graphKey: "amount",
                  yearData: getFormattedYearData(
                    indicators,
                    years,
                    "totOwnRevenue",
                    formatToCrore
                  ),
                  className: "ps-5 ",
                },
                {
                  name: "Assigned Revenue (Cr)",
                  graphKey: "amount",
                  yearData: getFormattedLineItemDataByYear(
                    indicators,
                    years,
                    "120",
                    formatToCrore
                  ),
                  className: "ps-5 ",
                },
                {
                  name: "Revenue Grants (Cr)",
                  graphKey: "amount",
                  yearData: getFormattedLineItemDataByYear(
                    indicators,
                    years,
                    "160",
                    formatToCrore
                  ),
                  className: "ps-5 ",
                },
                {
                  name: "Others (Cr)",
                  graphKey: "amount",
                  yearData: getFormattedLineItemDataByYear(
                    indicators,
                    years,
                    "100",
                    formatToCrore
                  ),
                  className: "ps-5 ",
                },
              ],
            },
            {
              name: "Total Expenditure (Cr)",
              graphKey: "amount",
              isParent: "true",
              yearData: getFormattedYearData(
                indicators,
                years,
                "totExpenditure",
                formatToCrore
              ),
              yearGrowth: getYearGrowth(indicators, years, "totExpenditure"),
              info: getInfoHTML("totExpenditure"),
              children: [
                {
                  name: "Total Revenue Expenditure (Cr)",
                  graphKey: "amount",
                  yearData: getFormattedYearData(
                    indicators,
                    years,
                    "totRevenueExpenditure",
                    formatToCrore
                  ),
                  className: "ps-5 ",
                },
                {
                  name: "Total Capital Expenditure (Cr)",
                  graphKey: "amount",
                  yearData: getFormattedYearData(
                    indicators,
                    years,
                    "capex",
                    formatToCrore
                  ),
                  className: "ps-5 ",
                },
              ],
            },
            {
              name: "Total Debt (Cr)",
              graphKey: "amount",
              isParent: "true",
              yearData: getFormattedYearData(
                indicators,
                years,
                "totDebt",
                formatToCrore
              ),
              yearGrowth: getYearGrowth(indicators, years, "totDebt"),
              info: getInfoHTML("totDebt"),
              children: [
                {
                  name: "Secured Loans (Cr)",
                  graphKey: "amount",
                  yearData: getFormattedLineItemDataByYear(
                    indicators,
                    years,
                    "330",
                    formatToCrore
                  ),
                  className: "ps-5 ",
                },
                {
                  name: "Unsecured Loans (Cr)",
                  graphKey: "amount",
                  yearData: getFormattedLineItemDataByYear(
                    indicators,
                    years,
                    "331",
                    formatToCrore
                  ),
                  className: "ps-5 ",
                },
              ],
            },
            {
              name: "Total Expenditure to Total Revenue Receipts (%)",
              graphKey: "percentage",
              isParent: "true",
              yearData: getYearData(
                indicators,
                years,
                "totExpenditureByTotRevenue"
              ),
              info: getInfoHTML("totExpenditureByTotRevenue"),
            },
            {
              name: "Own Source Revenue to Total Revenue Receipts (%)",
              graphKey: "percentage",
              isParent: "true",
              yearData: getYearData(
                indicators,
                years,
                "totOwnRevenueByTotRevenue"
              ),
              info: getInfoHTML("totOwnRevenueByTotRevenue"),
            },
            {
              name: "Grants to Total Revenue Receipts (%)",
              graphKey: "percentage",
              isParent: "true",
              yearData: getYearData(indicators, years, "grantsByTotRevenue"),
              info: getInfoHTML("grantsByTotRevenue"),
            },
            {
              name: "Own Source Revenue to Total Expenditure (%)",
              graphKey: "percentage",
              isParent: "true",
              yearData: getYearData(
                indicators,
                years,
                "totExpenditureByTotOwnRevenue"
              ),
              info: getInfoHTML("totExpenditureByTotOwnRevenue"),
            },
            {
              name: "Capital Expenditure to Total Expenditure (%)",
              graphKey: "percentage",
              isParent: "true",
              yearData: getYearData(
                indicators,
                years,
                "capitalExpenditureByTotExpenditure"
              ),
              info: getInfoHTML("capitalExpenditureByTotExpenditure"),
            },
            {
              name: "Operating Revenue Surplus (Cr)",
              graphKey: "amount",
              isParent: "true",
              yearData: getFormattedYearData(
                indicators,
                years,
                "operatingSurplus",
                formatToCrore
              ),
              yearGrowth: getYearGrowth(indicators, years, "operatingSurplus"),
              info: getInfoHTML("operatingSurplus"),
            },
          ],
        };
        break;
      }
      case "revenue": {
        var response = {
          intro: intro,
          data: [
            header,
            {
              name: "Total Revenue Receipts (Cr)",
              graphKey: "amount",
              isParent: "true",
              yearData: getFormattedYearData(
                indicators,
                years,
                "totRevenue",
                formatToCrore
              ),
              yearGrowth: getYearGrowth(indicators, years, "totRevenue"),
              info: getInfoHTML("totRevenue"),
              children: [
                {
                  name: "Own Source Revenue (Cr)",
                  graphKey: "amount",
                  yearData: getFormattedYearData(
                    indicators,
                    years,
                    "totOwnRevenue",
                    formatToCrore
                  ),
                  className: "ps-5 ",
                },
                {
                  name: "Assigned Revenue (Cr)",
                  graphKey: "amount",
                  yearData: getFormattedLineItemDataByYear(
                    indicators,
                    years,
                    "120",
                    formatToCrore
                  ),
                  className: "ps-5 ",
                },
                {
                  name: "Revenue Grants (Cr)",
                  graphKey: "amount",
                  yearData: getFormattedLineItemDataByYear(
                    indicators,
                    years,
                    "160",
                    formatToCrore
                  ),
                  className: "ps-5 ",
                },
                {
                  name: "Others (Cr)",
                  graphKey: "amount",
                  yearData: getFormattedLineItemDataByYear(
                    indicators,
                    years,
                    "100",
                    formatToCrore
                  ),
                  className: "ps-5 ",
                },
              ],
            },
            {
              name: "Total Own Source Revenue (Cr)",
              graphKey: "amount",
              isParent: "true",
              yearData: getFormattedYearData(
                indicators,
                years,
                "totOwnRevenue",
                formatToCrore
              ),
              yearGrowth: getYearGrowth(indicators, years, "totRevenue"),
              info: getInfoHTML("totOwnRevenue"),
              children: [
                {
                  name: "Tax Revenue(Cr)",
                  graphKey: "amount",
                  yearData: getFormattedLineItemDataByYear(
                    indicators,
                    years,
                    "110",
                    formatToCrore
                  ),
                  className: "ps-5 ",
                },
                {
                  name: "Rental Income(Cr)",
                  graphKey: "amount",
                  yearData: getFormattedLineItemDataByYear(
                    indicators,
                    years,
                    "130",
                    formatToCrore
                  ),
                  className: "ps-5 ",
                },
                {
                  name: "Fee & User Charges(Cr)",
                  graphKey: "amount",
                  yearData: getFormattedLineItemDataByYear(
                    indicators,
                    years,
                    "140",
                    formatToCrore
                  ),
                  className: "ps-5 ",
                },
                {
                  name: "Sale & Hire Charges(Cr)",
                  graphKey: "amount",
                  yearData: getFormattedLineItemDataByYear(
                    indicators,
                    years,
                    "150",
                    formatToCrore
                  ),
                  className: "ps-5 ",
                },
                {
                  name: "Other Income(Cr)",
                  graphKey: "amount",
                  yearData: getFormattedLineItemDataByYear(
                    indicators,
                    years,
                    "180",
                    formatToCrore
                  ),
                  className: "ps-5 ",
                },
                {
                  name: "Income from Investment(Cr)",
                  graphKey: "amount",
                  yearData: getFormattedLineItemDataByYear(
                    indicators,
                    years,
                    "170",
                    formatToCrore
                  ),
                  className: "ps-5 ",
                },
                {
                  name: "Interest Earned(Cr)",
                  graphKey: "amount",
                  yearData: getFormattedLineItemDataByYear(
                    indicators,
                    years,
                    "171",
                    formatToCrore
                  ),
                  className: "ps-5 ",
                },
              ],
            },
            {
              name: "Own Source Revenue to Total Revenue Receipts (%)",
              graphKey: "percentage",
              isParent: "true",
              yearData: getYearData(
                indicators,
                years,
                "totOwnRevenueByTotRevenue"
              ),
              info: getInfoHTML("totOwnRevenueByTotRevenue"),
            },
            {
              name: "Grants to Total Revenue Receipts (%)",
              graphKey: "percentage",
              isParent: "true",
              yearData: getYearData(indicators, years, "grantsByTotRevenue"),
              info: getInfoHTML("grantsByTotRevenue"),
            },
          ],
        };
        break;
      }
      case "expenditure": {
        const keysToSum = [
          "250",
          "260",
          "270",
          "271",
          "272",
          "280",
          "290",
          "200",
        ];
        const getCapex = getFormattedYearData(
          indicators,
          years,
          "capex",
          formatToCrore
        );
        const finalCapex = getCapex.map((value) => {
          // Case 1: value is N/A, empty, or null
          if (value === "N/A" || value === "" || value === null) {
            return "N/A";
          }

          // Convert to number safely
          const num = Number(value);

          // Case 2: not a number OR negative
          if (isNaN(num) || num < 0) {
            return "N/A";
          }

          // Otherwise keep original value
          return value;
        });
        // console.log(getCapex, "this is capex");
        const getRevExpenditure = getFormattedYearData(
          indicators,
          years,
          "totRevenueExpenditure",
          formatToCrore
        );
        // console.log(getRevExpenditure, "this is revexpenditure");
        const gettotlExpenditure = getFormattedYearData(
          indicators,
          years,
          "totExpenditure",
          formatToCrore
        );
        // console.log(gettotlExpenditure, "this is total expenditure");
        const getTotExpenditureByTotRevenue = getYearData(
          indicators,
          years,
          "totExpenditureByTotRevenue"
        );

        // console.log(getTotExpenditureByTotRevenue, "this is total expenditure");
        const finalGetTotExpenditureByTotRevenue = finalCapex.map(
          (capexVal, i) => {
            if (capexVal === "N/A") {
              return "N/A";
            }
            return getTotExpenditureByTotRevenue[i]; // Use rev expenditure value
          }
        );

        const getcapitalExpenditureByTotExpenditure = getYearData(
          indicators,
          years,
          "totExpenditureByTotRevenue"
        );

        // console.log(
        //   getcapitalExpenditureByTotExpenditure,
        //   "this is total expenditure"
        // );
        const finalgetcapitalExpenditureByTotExpenditure = finalCapex.map(
          (capexVal, i) => {
            if (capexVal === "N/A") {
              return "N/A";
            }
            return getcapitalExpenditureByTotExpenditure[i]; // Use rev expenditure value
          }
        );

        var response = {
          intro: intro,
          data: [
            header,
            {
              name: "Total Expenditure (Cr)",
              graphKey: "amount",
              isParent: "true",
              yearData: calculateTotalExpenditure(getCapex, getRevExpenditure),
              yearGrowth: getYearGrowth(indicators, years, "totExpenditure"),
              info: getInfoHTML("totExpenditure"),
              children: [
                {
                  name: "Total Revenue Expenditure (Cr)",
                  graphKey: "amount",
                  yearData: getFormattedYearData(
                    indicators,
                    years,
                    "totRevenueExpenditure",
                    formatToCrore
                  ),
                  className: "ps-5 ",
                },
                {
                  name: "Total Capital Expenditure (Cr)",
                  graphKey: "amount",
                  yearData: finalCapex,
                  className: "ps-5 ",
                },
              ],
            },
            {
              name: "Total Revenue Expenditure (Cr)",
              graphKey: "amount",
              isParent: "true",
              yearData: getFormattedYearData(
                indicators,
                years,
                "totRevenueExpenditure",
                formatToCrore
              ),
              yearGrowth: getYearGrowth(
                indicators,
                years,
                "totRevenueExpenditure"
              ),
              info: getInfoHTML("totRevenueExpenditure"),
              children: [
                {
                  name: "Establishment Expenses (Cr)",
                  graphKey: "amount",
                  yearData: getFormattedLineItemDataByYear(
                    indicators,
                    years,
                    "210",
                    formatToCrore
                  ),
                  className: "ps-5 ",
                },
                {
                  name: "Administrative Expenses (Cr)",
                  graphKey: "amount",
                  yearData: getFormattedLineItemDataByYear(
                    indicators,
                    years,
                    "220",
                    formatToCrore
                  ),
                  className: "ps-5 ",
                },
                {
                  name: "O&M Expenses (Cr)",
                  graphKey: "amount",
                  yearData: getFormattedLineItemDataByYear(
                    indicators,
                    years,
                    "230",
                    formatToCrore
                  ),
                  className: "ps-5 ",
                },
                {
                  name: "Interest Charges (Cr)",
                  graphKey: "amount",
                  yearData: getFormattedLineItemDataByYear(
                    indicators,
                    years,
                    "240",
                    formatToCrore
                  ),
                  className: "ps-5 ",
                },
                {
                  name: "Others (Cr)",
                  graphKey: "amount",
                  yearData: getFormattedLineItemSumByYear(
                    indicators,
                    years,
                    keysToSum,
                    formatToCrore
                  ),
                  className: "ps-5 ",
                },
              ],
            },
            {
              name: "Total Expenditure to Total Revenue Receipts (%)",
              graphKey: "percentage",
              isParent: "true",
              yearData: finalGetTotExpenditureByTotRevenue,
              info: getInfoHTML("totExpenditureByTotRevenue"),
            },
            {
              name: "Own Source Revenue to Revenue Expenditure (%)",
              graphKey: "percentage",
              isParent: "true",
              yearData: getYearData(
                indicators,
                years,
                "totOwnRevenueByTotRevenueExpenditure"
              ),
              info: getInfoHTML("totOwnRevenueByTotRevenueExpenditure"),
            },
            {
              name: "Capital Expenditure to Total Expenditure (%)",
              graphKey: "percentage",
              isParent: "true",
              yearData: finalgetcapitalExpenditureByTotExpenditure,
              info: getInfoHTML("capitalExpenditureByTotExpenditure"),
            },
          ],
        };
        break;
      }
      case "debt": {
        var response = {
          intro: intro,
          data: [
            header,
            {
              name: "Total Debt (Cr)",
              graphKey: "amount",
              isParent: "true",
              yearData: getFormattedYearData(
                indicators,
                years,
                "totDebt",
                formatToCrore
              ),
              yearGrowth: getYearGrowth(indicators, years, "totDebt"),
              info: getInfoHTML("totDebt"),
              children: [
                {
                  name: "Secured Loans (Cr)",
                  graphKey: "amount",
                  yearData: getFormattedLineItemDataByYear(
                    indicators,
                    years,
                    "330",
                    formatToCrore
                  ),
                  className: "ps-5 ",
                },
                {
                  name: "Unsecured Loans (Cr)",
                  graphKey: "amount",
                  yearData: getFormattedLineItemDataByYear(
                    indicators,
                    years,
                    "331",
                    formatToCrore
                  ),
                  className: "ps-5 ",
                },
              ],
            },
            {
              name: "Total Assets (Cr)",
              graphKey: "amount",
              isParent: "true",
              yearData: getFormattedYearData(
                indicators,
                years,
                "totAssets",
                formatToCrore
              ),
              yearGrowth: getYearGrowth(indicators, years, "totAssets"),
              info: getInfoHTML("totAssets"),
            },
            {
              name: "Debt to Asset Ratio",
              graphKey: "percentage",
              isParent: "true",
              yearData: getYearData(indicators, years, "totDebtByTotAssets"),
              info: getInfoHTML("totDebtByTotAssets"),
            },
            {
              name: "Debt-to-Own Source Revenue Ratio",
              graphKey: "percentage",
              isParent: "true",
              yearData: getYearData(
                indicators,
                years,
                "totDebtByTotOwnRevenue"
              ),
              info: getInfoHTML("totDebtByTotOwnRevenue"),
            },
            {
              name: "Interest Service Coverage Ratio (ISCR)",
              graphKey: "percentage",
              isParent: "true",
              yearData: getYearData(indicators, years, "iscrRatio"),
              info: getInfoHTML("iscrRatio"),
            },
            {
              name: "Quick Asset Ratio",
              graphKey: "percentage",
              isParent: "true",
              yearData: getYearData(indicators, years, "qaRatio"),
              info: getInfoHTML("qaRatio"),
            },
          ],
        };
        break;
      }
      default: {
        return "invalid key type";
      }
    }
    res.status(200).json({ source, response });
  } catch (error) {
    console.error("Error fetching city dashboard indicators:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
function calculateTotalExpenditure(capex, revexpenditure) {
  const totalExpenditure = [];

  for (let i = 0; i < capex.length; i++) {
    const capexVal = capex[i];
    const revexVal = revexpenditure[i];

    // Convert rev exp properly
    const rev =
      revexVal === "N/A" || revexVal === "" || revexVal == null
        ? 0
        : Number(revexVal);

    // Case 1: capex is N/A
    if (capexVal === "N/A" || capexVal === "" || capexVal == null) {
      totalExpenditure.push(rev);
      continue;
    }

    const cap = Number(capexVal);

    // Case 2: capex is a negative number
    if (isNaN(cap) || cap < 0) {
      totalExpenditure.push(rev);
      continue;
    }

    // Case 3: normal addition
    totalExpenditure.push(cap + rev);
  }

  return totalExpenditure;
}

function filterIndicatorsWithYear(indicatorsData) {
  return indicatorsData.map((data) => {
    // console.log(data,'before')
    const { year, indicators, ulb } = data;
    // Create a new object where we filter out keys with "N/A" values
    const filteredIndicators = Object.entries(indicators)
      .filter(([key, value]) => value !== "N/A" && !isNaN(Number(value))) // Remove "N/A" and invalid values
      .reduce((acc, [key, value]) => {
        acc[key] = value; // Add valid key-value pair to the accumulator
        return acc;
      }, {});
    //  console.log({ulb, year, indicators: filteredIndicators },'after');
    return { ulb, year, indicators: filteredIndicators };
  });
}

function getIndicatorValue(indicatorKey, data, yearsArray) {
  const years = [...yearsArray];
  const reversedYears = years.reverse();
  for (const year of reversedYears) {
    const yearData = data.find((item) => item.year === year);
    if (yearData && yearData.indicators) {
      const indicatorValue = yearData.indicators[indicatorKey];
      const ulbName = yearData.ulb;
      if (indicatorValue !== "N/A" && indicatorValue !== undefined) {
        return { value: indicatorValue, year, ulbName };
      }
    }
    // console.log(data[0]?.ulb, "this is data")
    return { value: "N/A", year: year, ulb: data[0]?.ulb };
  }
}

async function getIntro(indicators, keyType, yearsArray) {
  if (!["overview", "revenue", "expenditure", "debt"].includes(keyType)) {
    return "Invalid keyType.";
  }
  // console.log(yearsArray, "this is key");
  const finalObject = filterIndicatorsWithYear(indicators);
  switch (keyType) {
    case "overview": {
      const totRevenueData = getIndicatorValue(
        "totRevenue",
        finalObject,
        yearsArray
      );
      const totRevenueExpenditure = getIndicatorValue(
        "totRevenueExpenditure",
        finalObject,
        yearsArray
      );
      // console.log(totRevenueData,totRevenueExpenditure,'this is data object')
      return `In FY ${totRevenueData.year}, ${
        totRevenueData.ulbName
      } reported a total revenue of INR ${formatToCroreSummary(
        totRevenueData.value
      )} crore and a total expenditure of INR ${formatToCroreSummary(
        totRevenueExpenditure.value
      )} crore, implying that its expenditure accounted for ${Math.round(
        (totRevenueExpenditure.value / totRevenueData.value) * 100
      )}% of its revenue`;
    }
    case "revenue": {
      const revPayload = finalObject.map((yearData) => {
        return {
          year: yearData.year,
          totRevenue: getTotRevenue(yearData),
        };
      });
      // console.log(revPayload,'this is rev')
      const totRevenueData = getIndicatorValue(
        "totRevenue",
        finalObject,
        yearsArray
      );
      // console.log(finalObject,yearsArray,'this is cagr')
      const cagr = getCAGRValue(revPayload);
      // console.log(cagr, "this is cagr");
      return `${totRevenueData.ulbName}’s total revenue for FY ${
        totRevenueData.year
      } was INR ${formatToCroreSummary(totRevenueData.value)} crore.${cagr}`;
    }
    case "expenditure": {
      const totExpenditure = getIndicatorValue(
        "totExpenditure",
        finalObject,
        yearsArray
      );
      // console.log(totExpenditureDisplay, "totalexp");
      const capex = getIndicatorValue("capex", finalObject, yearsArray);
      const raw = capex?.value;
      const num =
        typeof raw === "number"
          ? raw
          : typeof raw === "string" && raw.trim() !== ""
          ? Number(raw.replace(/,/g, ""))
          : NaN;

      // Show "N/A" if negative or not a valid number; otherwise show the value
      const capexDisplay = Number.isFinite(num) && num >= 0 ? num : "N/A";
      const totRevenueExpenditure = getIndicatorValue(
        "totRevenueExpenditure",
        finalObject,
        yearsArray
      );
      return `In FY ${totRevenueExpenditure.year}, ${
        totRevenueExpenditure.ulbName
      } reported a total expenditure of INR ${formatToCroreSummary(
        totExpenditure?.value ?? "N/A"
      )} crore which included INR ${formatToCroreSummary(
        capexDisplay
      )} crore in capital expenditure and INR ${formatToCroreSummary(
        totRevenueExpenditure.value
      )} crore in revenue expenditure.`;
    }
    case "debt": {
      const debt = getIndicatorValue("totDebt", finalObject, yearsArray);
      // console.log(debt, "this is debt");
      const totAssets = getIndicatorValue("totAssets", finalObject, yearsArray);
      // console.log(totAssets, "this is assets");
      if (!debt || debt.value == null || debt.value === "N/A") {
        return `The debt information is not available for the FY ${
          debt.year
        },but the ${
          debt?.ulb ?? totAssets?.ulbName
        }’s total assets valued at INR ${formatToCroreSummary(
          totAssets.value
        )} crore`;
      }

      return `As of FY ${debt.year}, ${
        debt?.ulb ?? totAssets?.ulbName
      }’s outstanding debt stood at INR ${formatToCroreSummary(
        debt.value
      )} crore, against total assets valued at INR ${formatToCroreSummary(
        totAssets.value
      )} crore`;
    }
    default:
      console.log("Invalid keyType");
  }
}
function getCAGRValue(revArray) {
  // console.log(revArray, "this is revArray");
  if (!Array.isArray(revArray) || revArray.length < 2) {
    return "No CAGR available.";
  }
  // Sort by start year (based on first part of 'YYYY-YY')
  const sorted = revArray
    .slice()
    .sort(
      (a, b) => parseInt(a.year.split("-")[0]) - parseInt(b.year.split("-")[0])
    );

  // Filter valid entries with positive revenue
  const validEntries = sorted.filter(
    (entry) => typeof entry.totRevenue === "number" && entry.totRevenue > 0
  );

  if (validEntries.length < 2) {
    return "Insufficient data to calculate CAGR.";
  }

  const start = validEntries[0];
  const end = validEntries[validEntries.length - 1];

  const startYear = start.year;
  const endYear = end.year;

  const startValue = start.totRevenue;
  const endValue = end.totRevenue;

  const yearDiff =
    parseInt(endYear.split("-")[0]) - parseInt(startYear.split("-")[0]);

  if (yearDiff <= 0) {
    return "Invalid year range for CAGR calculation.";
  }

  const cagr = (Math.pow(endValue / startValue, 1 / yearDiff) - 1) * 100;

  // Convert values to crores
  const startCr = formatToCroreSummary(startValue);
  // const startCr = (startValue / 1e7).toFixed(2);
  const endCr = formatToCroreSummary(endValue);
  // const endCr = (endValue / 1e7).toFixed(2);
  const cagrStr = Math.round(cagr);

  return `Over the years from FY ${startYear} to FY ${endYear}, the city’s revenue grew from INR ${startCr} crore to INR ${endCr} crore, registering a CAGR of ${cagrStr}%.`;
}

function getTotRevenue(yearData) {
  if (
    yearData &&
    yearData.indicators &&
    yearData.indicators.totRevenue !== "N/A" &&
    !isNaN(Number(yearData.indicators.totRevenue))
  ) {
    return yearData.indicators.totRevenue;
  }
  return "N/A"; // Return "N/A" if no valid data is available
}
function buildSourceStatement(records = []) {
  if (!Array.isArray(records) || records.length === 0) return "";

  const ulb = records[0]?.ulb || "the ULB";

  // Keep the input order; treat anything not exactly "Audited" (case-insensitive) as unaudited
  const auditedYears = [];
  const unauditedYears = [];

  for (const r of records) {
    const year = r?.year ?? "";
    const status = String(r?.audit_status || "").toLowerCase();
    if (status === "audited") auditedYears.push(year);
    else unauditedYears.push(year);
  }

  const parts = [];
  if (auditedYears.length && !unauditedYears.length) {
    // Case: all audited
    parts.push(`Audited statements for ${ulb} — ${joinYears(auditedYears)}`);
  } else if (!auditedYears.length && unauditedYears.length) {
    // Case 3: all unaudited
    parts.push(
      `Unaudited statements for ${ulb} — ${joinYears(unauditedYears)}`
    );
  } else {
    // Case 1/2: mixed
    parts.push(`Audited statements for ${joinYears(auditedYears)}`);
    parts.push(`unaudited statements for ${joinYears(unauditedYears)}`);
    return `${parts[0]} and ${parts[1]} — ${ulb}`;
  }

  return `${parts[0]}`;
}
function joinYears(years) {
  if (years.length === 0) return "";
  if (years.length === 1) return years[0];
  if (years.length === 2) return `${years[0]} and ${years[1]}`;
  return `${years.slice(0, -1).join(", ")} and ${years[years.length - 1]}`;
}
module.exports.getYearsDynamic = async (req, res) => {
  // console.log(req.query, "this is params");
  const { ulbId } = req.query;
  const yearDropdown = await ledgerLog.aggregate([
    {
      $match: {
        ulb_id: ObjectId(ulbId),
        lineItems: { $ne: null },
      },
    },
    {
      $project: {
        year: 1,
      },
    },
  ]);
  const years = yearDropdown
    .map(({ year }) => String(year))
    .filter(Boolean)
    .reverse();
  res.status(200).json({ years });
};
module.exports.getFaqs = async (req, res) => {
  try {
    const { year, ulbId, state, populationType } = req.query;
    if (!year) return res.status(400).json({ error: "year is required" });
    // console.log(year, ulbId, state, "this is query params");
    const faqPipeline = await buildFaqPipeline({ year, ulbId, state });
    const result = await ledgerLog.aggregate(faqPipeline);
    const faqData = Array.isArray(result) ? result[0] : result;
    let faqs = [];
    if (populationType === "cat1") {
      const statesWithYes = new Set([
        "Chhattisgarh",
        "Gujarat",
        "Jharkhand",
        "Maharashtra",
        "Telangana",
      ]);

      const cityName = faqData?.ulbTop?.ulb ?? faqData?.ulbMeta?.ulb ?? "N/A";
      const stateName = faqData?.stateTop?.state ?? null;

      const ulbTotRevText =
        faqData?.ulbTop?.indicators?.totRevenue != null
          ? formatToCroreSummary(faqData.ulbTop.indicators.totRevenue)
          : "N/A";

      const nationalTotRevText =
        faqData?.national?.indicators?.totRevenue != null
          ? formatToCroreSummary(faqData.national.indicators.totRevenue)
          : "N/A";

      const ownShareText =
        faqData?.ulbTop?.indicators?.totOwnRevenueByTotRevenue != null
          ? Math.round(faqData.ulbTop.indicators.totOwnRevenueByTotRevenue)
          : "N/A";

      const propTaxVal = faqData?.ulbTop?.lineItems?.["11001"];
      const propTaxText =
        propTaxVal != null ? formatToCroreSummary(propTaxVal) : "N/A";

      const publishesSLB = stateName ? statesWithYes.has(stateName) : false;

      faqs = [
        {
          question: `How does ${cityName}’s revenue compare to other municipal cities?`,
          answer: `In FY ${year}, ${cityName} recorded a total revenue of INR ${ulbTotRevText} crore. Among cities in ${
            faqData?.stateTop?.state ?? "N/A"
          }, ${
            faqData?.stateTop?.ulb ?? "N/A"
          } had the highest revenue. Nationally, the top revenue was reported by ${
            faqData?.national?.ulb ?? "N/A"
          } at over INR ${nationalTotRevText} crore.`,
        },
        {
          question: `What are the major income sources of ${cityName}?`,
          answer: `${cityName}’s revenue comprises a mix of own-source revenues, such as property tax, user charges, and rental income, along with assigned revenues (the city's share in state taxes), and grants from the central and state governments. In FY ${year}, own-source revenues contributed approximately ${ownShareText}% of the city’s total revenue.`,
        },
        {
          question: `What is ${cityName}’s property tax collection in recent years?`,
          answer: `In FY ${year}, ${cityName} collected INR ${propTaxText} crore in property tax.`,
        },
        {
          question: `Does ${cityName} publish service level benchmark data?`,
          answer: `${publishesSLB ? "Yes" : "No"}, ${cityName} ${
            publishesSLB ? "reports" : "does not report"
          } its Service Level Benchmark (SLB) data.`,
        },
      ];
    }
    if (populationType === "cat2") {
      const cityName = faqData?.ulbTop?.ulb ?? faqData?.ulbMeta?.ulb ?? "N/A";

      const grantsPctText =
        faqData?.ulbTop?.indicators?.grantsByTotRevenue != null
          ? faqData.ulbTop.indicators.grantsByTotRevenue
          : "N/A";

      const grantsAmtVal = faqData?.ulbTop?.lineItems?.["160"];
      const grantsAmtText =
        grantsAmtVal != null ? formatToCrore(grantsAmtVal) : "N/A";

      const adminVal = faqData?.ulbTop?.lineItems?.["210"];
      const estabVal = faqData?.ulbTop?.lineItems?.["220"];
      const adminEstabTotalNum =
        (Number.isFinite(adminVal) ? adminVal : 0) +
        (Number.isFinite(estabVal) ? estabVal : 0);
      const adminEstabTotalText =
        adminEstabTotalNum > 0 ? formatToCrore(adminEstabTotalNum) : "N/A";

      const revExpDen = Number.isFinite(
        faqData?.ulbTop?.indicators?.totRevenueExpenditure
      )
        ? faqData.ulbTop.indicators.totRevenueExpenditure
        : null;

      const adminEstabPct =
        Number.isFinite(adminEstabTotalNum) &&
        Number.isFinite(revExpDen) &&
        revExpDen > 0
          ? (adminEstabTotalNum / revExpDen) * 100
          : null;
      const adminEstabPctText =
        adminEstabPct != null ? adminEstabPct.toFixed(2) : "N/A";

      const opSurplusVal = Number.isFinite(
        faqData?.ulbTop?.indicators?.operatingSurplus
      )
        ? faqData.ulbTop.indicators.operatingSurplus
        : null;
      const opState =
        opSurplusVal == null
          ? "balance"
          : opSurplusVal >= 0
          ? "surplus"
          : "deficit";
      const opAbsText =
        opSurplusVal == null ? "N/A" : formatToCrore(Math.abs(opSurplusVal));

      faqs = [
        {
          question: `How much of ${cityName}’s revenue came from grants?`,
          answer: `In FY ${year}, grants contributed ${grantsPctText}% of ${cityName}’s total revenue, amounting to INR ${grantsAmtText} crore.`,
        },
        {
          question: `How much money does ${cityName} spend towards administrative and establishment expenditure?`,
          answer: `In FY ${year}, ${cityName} spent INR ${adminEstabTotalText} crore (${adminEstabPctText}%) of its revenue expenditure towards administrative and establishment expenses.`,
        },
        {
          question: `Does ${cityName} earn enough revenue to cover its day-to-day expenses?`,
          answer: `This is measured as operating surplus or deficit. In FY ${year}, ${cityName} recorded an operating ${opState} of INR ${opAbsText} crore. Such a ${opState} may ${
            opState === "surplus" ? "enhance" : "constrain"
          } the ULG's ability to effectively deliver public services.`,
        },
      ];
    }

    return res.json({ faqs });
  } catch (err) {
    console.error("Error in getFaqs:", err);
    return res.status(500).json({ error: err.message });
  }
};
async function buildFaqPipeline({ year, ulbId, state }) {
  const ulbObjectId =
    ulbId && ObjectId.isValid(ulbId) ? new ObjectId(ulbId) : null;

  const commonProject = {
    ulb: 1,
    state: 1,
    year: 1,
    "indicators.totRevenue": 1,
    "indicators.totOwnRevenueByTotRevenue": 1,
    "indicators.grantsByTotRevenue": 1,
    "indicators.operatingSurplus": 1,
    "indicators.totRevenueExpenditure": 1,
    "lineItems.11001": 1,
    "lineItems.160": 1,
    "lineItems.210": 1,
    "lineItems.220": 1,
  };
  // console.log(year, state, ulbId, "this is params");
  return [
    {
      $facet: {
        national: [
          {
            $match: {
              year,
              "indicators.totRevenue": { $exists: true, $nin: [null, "N/A"] },
            },
          },
          { $sort: { "indicators.totRevenue": -1 } },
          { $project: commonProject },
          { $limit: 1 },
        ],
        stateTop: [
          ...(state
            ? [
                {
                  $match: {
                    year,
                    state,
                    "indicators.totRevenue": {
                      $exists: true,
                      $nin: [null, "N/A"],
                    },
                  },
                },
              ]
            : []),
          { $sort: { "indicators.totRevenue": -1 } },
          { $project: commonProject },
          { $limit: 1 },
        ],
        ulbTop: [
          ...(ulbObjectId ? [{ $match: { year, ulb_id: ulbObjectId } }] : []),
          { $project: commonProject },
          { $limit: 1 },
        ],
        ulbMeta: [
          ...(ulbObjectId ? [{ $match: { ulb_id: ulbObjectId } }] : []),
          {
            $group: {
              _id: "$ulb_id",
              ulb: { $first: "$ulb" },
              state: { $first: "$state" },
            },
          },
          { $project: { _id: 0, ulb: 1, state: 1 } },
          { $limit: 1 },
        ],
      },
    },
    {
      $project: {
        national: { $arrayElemAt: ["$national", 0] },
        stateTop: { $arrayElemAt: ["$stateTop", 0] },
        ulbTop: { $arrayElemAt: ["$ulbTop", 0] },
        ulbMeta: { $arrayElemAt: ["$ulbMeta", 0] },
      },
    },
    // {
    //   $addFields: {
    //     ulbResolved: {
    //       ulb: { $ifNull: ["$ulbTop.ulb", "$ulbMeta.ulb"] },
    //       state: { $ifNull: ["$ulbTop.state", "$ulbMeta.state"] },
    //       requestedYear: year
    //     }
    //   }
    // }
  ];
}

module.exports.accumulateIndicators = accumulateIndicators;

//compare by apis
function toArray(v) {
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  return [v];
}
module.exports.getCompareByIndicators = async (req, res) => {
  try {
    const ulbIds = toArray(req.query.ulbIds);
    const years = toArray(req.query.years);
    const keyType = toArray(req.query.keyType);
    // console.log(req.query, "this is query");
    if (!ulbIds.length || !years.length || !keyType.length) {
      return res.status(400).json({
        message:
          "ulbIds, years, and keyType must be arrays with at least one value",
      });
    }
    const ulbIdArr = ulbIds.map((id) => {
      if (ObjectId.isValid(id)) return ObjectId(id);
      else return null;
    });
    const pipeLine = [
      {
        $match: {
          ulb_id: {
            $in: ulbIdArr,
          },
          year: {
            $in: years,
          },
        },
      },
      {
        $project: {
          ulb: 1,
          ulb_id: 1,
          year: 1,
          lineItems: 1,
          indicators: 1,
        },
      },
    ];
    //  console.log(JSON.stringify(pipeLine, null, 2),'this is pipeline');
    const records = await ledgerLog.aggregate(pipeLine);
    const toUnderscoreYear = (y) => String(y).trim().replaceAll("-", "_"); // "2020-21" -> "2020_21"
    const toHyphenYear = (y) => String(y).trim().replaceAll("_", "-"); // "2020_21" -> "2020-21"
    const yearsHyphen = years.map(toHyphenYear); // db usually stores "2020-21"
    const yearsUnder = years.map(toUnderscoreYear); // for column keys "2020_21"
    const keyTypeIn = keyType[0];
    const group = CompareBygroupIndicators.find((g) => g.key === keyTypeIn);
    if (!group) {
      return res
        .status(400)
        .json({ message: `Unknown keyType '${keyTypeIn}'.` });
    }
    const recordMap = new Map();
    for (const r of records) {
      const key = `${String(r.ulb_id)}_${toUnderscoreYear(r.year)}`;
      recordMap.set(key, r);
    }
    const baseHeaders = [
      { key: "indicator", label: "Indicator" },
      ...ulbIds.flatMap((ulbId) =>
        yearsUnder.map((yUnderscore, idx) => ({
          key: `${ulbId}_${yUnderscore}`,
          label: yearsHyphen[idx],
        }))
      ),
    ];
    const results = keyType.map((kt) => {
      const group = CompareBygroupIndicators.find((g) => g.key === kt);
      if (!group) return { keyType: kt, error: "Unknown keyType" };

      const data = group.indicators.map((def) => {
        const row = { indicator: def.name };

        for (let i = 0; i < ulbIds.length; i++) {
          const ulbId = ulbIds[i];
          for (let j = 0; j < yearsUnder.length; j++) {
            const colKey = `${ulbId}_${yearsUnder[j]}`;
            const rec = recordMap.get(colKey);
            const source =
              group.key === "keyNumbers" ? rec?.indicators : rec?.lineItems;

            const raw =
              source && Object.prototype.hasOwnProperty.call(source, def.key)
                ? source[def.key]
                : null;

            row[colKey] = raw === null || raw === undefined ? "N/A" : raw;
          }
        }
        return row;
      });

      return { keyType: kt, headers: baseHeaders, data };
    });

    return res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching compare by indicators:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
module.exports.getIndicatorsNameCompareByPage = async (req, res) => {
  try {
    const data = CompareBygroupIndicators.map((group) => ({
      label: String(group?.label ?? ""),
      key: String(group?.key ?? ""),
      isActive: false,
      children: Array.isArray(group?.indicators)
        ? group.indicators.map((ind) => ({
            key: String(ind?.key ?? ""),
            label: String(ind?.name ?? ""),
            isActive: false,
          }))
        : [],
    }));

    return res.status(200).json({ data });
  } catch (error) {
    console.error("Error fetching indicators comparison:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
module.exports.getUlbDetailsById = async (req, res) => {
  try {
    const { slug } = req.query; // expect ?ulbId=66e1748d3b.... style string

    if (!slug) {
      return res.status(400).json({ message: "ulbId is required" });
    }

    // if (!mongoose.Types.ObjectId.isValid(ulbId)) {
    //   return res.status(400).json({ message: "Invalid ulbId" });
    // }

    const ulbDetails = await ulb.find({ slug: slug }).exec();

    if (!ulbDetails || ulbDetails.length === 0) {
      return res.status(404).json({ message: "ULB not found" });
    }

    return res.status(200).json({ ulbDetails });
  } catch (error) {
    console.error("Error fetching ULB details by ID:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
// Helper: build last 3 years array from "2021-22"
function lastThreeYears(selectedYearStr) {
  // expected format "2021-22"
  const parts = selectedYearStr.split("-");
  if (parts.length !== 2)
    throw new Error("Invalid year format. Expected 'YYYY-YY' like '2021-22'");
  const startYear = parseInt(parts[0], 10);
  if (Number.isNaN(startYear)) throw new Error("Invalid year start part");
  const years = [];
  for (let i = 2; i >= 0; i--) {
    const from = startYear - i;
    const to = String(from + 1).slice(-2);
    years.push(`${from}-${to}`);
  }
  return years;
}

// Helper: format ledger value robustly
function formatLedgerValue(val) {
  if (val === null || val === undefined) return "N/A";
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed === "" || trimmed.toUpperCase() === "N/A") return "N/A";
    const num = Number(trimmed.replace(/,/g, "")); // allow comma thousands
    if (Number.isNaN(num)) return trimmed; // keep original string if non-numeric
    // round to 2 decimals
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }
  if (typeof val === "number") {
    return Number.isFinite(val)
      ? Math.round((val + Number.EPSILON) * 100) / 100
      : val;
  }
  return String(val);
}

// Controller: download Excel for Market Dashboard
exports.downloadMarketDashboardExcel = async (req, res) => {
  try {
    const { year, ulbId } = req.query;
    if (!year || !ulbId) {
      return res.status(400).json({ message: "year & ulbId are required" });
    }

    // Build last 3 fiscal years (e.g. ["2019-20","2020-21","2021-22"])
    const years = lastThreeYears(year);

    // 1) Fetch active line items EXCEPT excluded codes
    const excludeCodes = [
      "1001",
      "1002",
      "1003",
      "1004",
      "1005",
      "1006",
      "1007",
    ];

    const lineItems = await LineItem.find({
      isActive: true,
      code: { $nin: excludeCodes },
    })
      .sort({ headOfAccount: 1 })
      .lean();

    // 2) Fetch ledger logs for the requested ULB and years
    const ledgerLogs = await ledgerLog
      .find({
        ulb_id: mongoose.Types.ObjectId(ulbId),
        year: { $in: years },
      })
      .lean();

    const ulbName = ledgerLogs[0]?.ulb || "ULB";

    // Build ledger map
    const ledgerMap = {};
    for (const y of years) ledgerMap[y] = {};

    for (const log of ledgerLogs) {
      const items = log.lineItems || {};
      ledgerMap[log.year] = items;
    }

    // ---------------------------------------
    // ✅ 3) UPDATED HEADERS INCLUDING NEW COLUMNS
    // ---------------------------------------
    const columns = [
      { header: "Department", key: "department", width: 25 },
      { header: "Code", key: "code", width: 15 },
      { header: "Indicators", key: "indicator", width: 40 },
      ...years.map((y) => ({ header: y, key: y, width: 20 })),
    ];

    // ---------------------------------------
    // ✅ 4) UPDATED ROWS INCLUDING department + code
    // ---------------------------------------
    const rows = lineItems.map((li) => {
      const rowArr = [];

      // NEW FIELDS
      rowArr.push(li.headOfAccount || "N/A"); // department
      rowArr.push(li.code || "N/A"); // code

      rowArr.push(li.name); // indicator

      // yearly values
      for (const y of years) {
        const rawVal = ledgerMap[y]?.[li.code];
        rowArr.push(formatLedgerValue(rawVal));
      }

      return rowArr;
    });

    // 5) Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Market Dashboard", {
      views: [{ state: "visible" }],
    });

    // 6) Logo
    const logoPath = path.join(
      process.cwd(),
      "uploads",
      "logos",
      "Group 1.jpeg"
    );
    if (fs.existsSync(logoPath)) {
      const imageId = workbook.addImage({
        buffer: fs.readFileSync(logoPath),
        extension: "jpeg",
      });
      worksheet.addImage(imageId, {
        tl: { col: 0, row: 0 },
        br: { col: 4, row: 2 },
      });
    }

    // 7) Reserve rows 1–3 for logo
    const headerRowIndex = 4;
    worksheet.getRow(headerRowIndex).values = columns.map((c) => c.header);

    // Column widths
    for (let i = 0; i < columns.length; i++) {
      const col = worksheet.getColumn(i + 1);
      col.width = columns[i].width;
      col.alignment = {
        vertical: "middle",
        horizontal: i <= 1 ? "center" : "left",
      };
    }

    // Header style
    const headerRow = worksheet.getRow(headerRowIndex);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 20;

    // 8) Insert data rows
    rows.forEach((r) => worksheet.addRow(r));

    // 9) Footer row
    worksheet.addRow([
      `Can't find what you are looking for? Contact us at contact@${
        process.env.PROD_HOST || "example.com"
      }`,
    ]);

    // 10) Send file
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=MarketDashboard_${ulbName}_${year}.xlsx`
    );

    await workbook.xlsx.write(res);
    return res.end();
  } catch (err) {
    console.error("EXCEL ERROR:", err);
    return res
      .status(500)
      .json({ message: "Something went wrong", error: err.message });
  }
};

//

// helpers you need to have in scope:
// const mongoose = require('mongoose');
// const UlbModel = require('../models/ulb');       // your ULB model
// const LedgerLogModel = require('../models/ledgerLog'); // your ledger log model
// function getPopulationCategory(population) { ... } // you mentioned earlier
// ROUND_UP constant or rounding helper
// 🧠 Utility: population category computation inline for convenience
function populationCategoryData(pop) {
  return {
    $switch: {
      branches: [
        { case: { $lt: [pop, 100000] }, then: "<100K" },
        {
          case: { $and: [{ $gte: [pop, 100000] }, { $lt: [pop, 500000] }] },
          then: "100K-500K",
        },
        {
          case: { $and: [{ $gte: [pop, 500000] }, { $lt: [pop, 1000000] }] },
          then: "500K-1M",
        },
        {
          case: { $and: [{ $gte: [pop, 1000000] }, { $lt: [pop, 4000000] }] },
          then: "1M-4M",
        },
        { case: { $gte: [pop, 4000000] }, then: "4M+" },
      ],
      default: "NA",
    },
  };
}
// 🧩 Core Weighted Average Builder
async function getWeightedAvgData(
  compareIdMap,
  lineItem,
  ulbId,
  years,
  compareType,
  compareUlbs
) {
  let compareQueries = [];
  // console.log(
  //   "Getting weighted avg data...",
  //   compareIdMap,
  //   lineItem,
  //   ulbId,
  //   years,
  //   compareType,
  //   compareUlbs
  // );
  // Always fetch ULB data - for only 1 year.
  const ulbQuery = buildWeightedAvgPipeline(
    lineItem,
    years,
    ulbId,
    "ulb",
    compareIdMap
  );
  // console.log("ULB Query:", JSON.stringify(ulbQuery, null, 2));
  const compareId = compareIdMap[compareType] || "";
  compareQueries = [
    buildWeightedAvgPipeline(
      lineItem,
      years,
      compareId,
      compareType,
      compareIdMap
    ),
  ];
  // Run all queries in parallel
  const [ulbLedgerData, ...compareResults] = await Promise.all([
    ledgerLog.aggregate(ulbQuery),
    ...compareQueries.map((query) => ledgerLog.aggregate(query)),
  ]);

  // Response object
  return { ulbLedgerData, compareResults };
}
function getCagr(arr, yrs) {
  if (!Array.isArray(arr) || arr.length < 2 || yrs <= 0) {
    return 0;
    // throw new Error("Invalid input: need at least 2 values and positive number of years");
  }

  const startValue = arr[0];
  const endValue = arr[arr.length - 1];

  // if (startValue <= 0 || endValue <= 0) {
  //     throw new Error("Values must be positive for CAGR calculation");
  // }

  const cagr = (Math.pow(endValue / startValue, 1 / yrs) - 1) * 100;
  return +cagr.toFixed(2);
}

function buildWeightedAvgPipeline(
  lineItem,
  yearsArr,
  compareId,
  groupBy,
  compareIdMap
) {
  // console.log("----------------------", compareId, groupBy)
  // const ulbTypeId = compareIdMap.ulbType
  // if (!ulbTypeId) throw new Error("ULB type is required.");
  // console.log("Building weighted avg pipeline for:", {
  //   lineItem,
  //   yearsArr,
  //   compareId,
  //   groupBy,
  //   compareIdMap,
  // });
  // if (!Array.isArray(lineItemsArr) || lineItemsArr.length === 0) {
  //   throw new Error("lineItemsArr must be a non-empty array.");
  // }

  // Match input data
  const matchStage = {
    isStandardizable: { $ne: "No" },
    year: { $in: yearsArr.slice(0, 3) },
  };

  // Lookup ULB data
  const matchFromUlbs = {
    "ulbsData.isActive": true,
    "ulbsData.isPublish": true,
  };

  // if (groupBy !== 'ulb')
  //     matchFromUlbs['ulbsData.ulbType'] = new ObjectId(ulbTypeId);

  // Dynamic filters for groupBy
  const groupByFilters = {
    ulb: () => (matchStage["ulb_id"] = new ObjectId(compareId)),
    state: () => (matchFromUlbs["ulbsData.state"] = new ObjectId(compareId)),
    ulbType: () =>
      (matchFromUlbs["ulbsData.ulbType"] = new ObjectId(compareId)),
    popCat: () => (matchFromUlbs["popCat"] = compareId),
    national: () => {},
  };
  // console.log("Group by filters:", JSON.stringify(groupByFilters, null, 2));
  if (groupByFilters[groupBy]) groupByFilters[groupBy]();

  // Add selectedTotal field
  const addSelectedTotalStage = {
    selectedTotal: {
      $convert: {
        input: {
          $switch: {
            branches: [
              // Null or empty
              {
                case: {
                  $or: [
                    { $eq: [`$indicators.${lineItem}`, null] },
                    { $eq: [`$indicators.${lineItem}`, ""] },
                  ],
                },
                then: 0,
              },
              // N/A variations
              {
                case: {
                  $or: [
                    { $eq: [`$indicators.${lineItem}`, "N/A"] },
                    { $eq: [`$indicators.${lineItem}`, "NA"] },
                    { $eq: [`$indicators.${lineItem}`, "n/a"] },
                  ],
                },
                then: 0,
              },
            ],
            // If none of the above matched → try to convert actual value
            default: `$indicators.${lineItem}`,
          },
        },
        to: "double",
        onError: 0, // prevents crash on bad values
        onNull: 0,
      },
    },
  };

  // console.log(
  //   "Add selected total stage:",
  //   JSON.stringify(addSelectedTotalStage, null, 2)
  // );
  // Project weighted value
  const projectStage = {
    year: 1,
    weightedValue: { $multiply: ["$selectedTotal", "$ulbsData.population"] },
    population: "$ulbsData.population",
    ulbName: "$ulbsData.name",
  };
  // console.log("Project stage:", JSON.stringify(projectStage, null, 2));
  // Group by year
  const groupStage = {
    _id: "$year",
    totalWeightedValue: { $sum: "$weightedValue" },
    totalPopulation: { $sum: "$population" },
    ulbName: { $first: "$ulbName" },
  };
  // console.log("Group stage:", JSON.stringify(groupStage, null, 2));
  //  Final projection - convert to crores
  const finalProjectStage = {
    _id: 0,
    year: "$_id",
    label: 1,
    weightedAverageCr: {
      $round: [
        {
          $cond: [
            { $eq: ["$totalPopulation", 0] },
            null,
            {
              $divide: [
                { $divide: ["$totalWeightedValue", "$totalPopulation"] },
                10000000,
              ],
            },
          ],
        },
        ROUND_UP,
      ],
    },
  };

  // Will be used as label for the chart.
  if (LABEL_MAP.hasOwnProperty(groupBy)) {
    finalProjectStage.label = LABEL_MAP[groupBy];
  }

  // Final aggregation pipeline
  const pipeline = [
    { $match: matchStage },
    {
      $lookup: {
        from: "ulbs",
        localField: "ulb_id",
        foreignField: "_id",
        as: "ulbsData",
      },
    },
    { $unwind: "$ulbsData" },
    { $addFields: { popCat: populationCategoryData("$ulbsData.population") } },
    { $match: matchFromUlbs },
    { $addFields: addSelectedTotalStage },
    { $project: projectStage },
    { $group: groupStage },
    { $project: finalProjectStage },
  ];

  // console.log(JSON.stringify(pipeline, null, 2));
  return pipeline;
}
function keep3ItemsInArr(arr, lineItem) {
  // if (CAPEX.includes(lineItem)) {
  if (arr.length > 3) {
    arr = arr.slice(-3);
  }
  return arr;
}
function formatAmount(amt) {
  return typeof amt === "number" && !isNaN(amt)
    ? `Rs.${amt.toLocaleString("en-IN")} Cr`
    : "N/A";
}
function createResStructureWeighedAvgData(totalData, lineItem, years) {
  // Basic validation
  if (
    !totalData ||
    !Array.isArray(totalData.ulbLedgerData) ||
    totalData.ulbLedgerData.length === 0
  ) {
    return { msg: "Data not available.", success: false };
  }

  const yearIndexMap = years.reduce((map, year, index) => {
    map[year] = index;
    return map;
  }, {});

  const chartData = [];

  // Prepare main ULB data
  let ulbSubData = new Array(years.length).fill(null);
  for (const entry of totalData.ulbLedgerData) {
    if (entry && yearIndexMap.hasOwnProperty(entry.year)) {
      ulbSubData[yearIndexMap[entry.year]] = entry.weightedAverageCr;
    }
  }

  const customHoverLabels = [];
  for (let i = 0; i < years.length - 1; i++) {
    const prevYr = ulbSubData[i];
    const currYr = ulbSubData[i + 1];
    const growth =
      prevYr && currYr
        ? `${(((currYr - prevYr) / prevYr) * 100).toFixed(2)}%`
        : "NA";
    customHoverLabels.push(growth);
  }
  // console.log({ ulbSubData, yearIndexMap, customHoverLabels });
  ulbSubData = keep3ItemsInArr(ulbSubData);
  years = keep3ItemsInArr(years);

  chartData.push({
    type: "line",
    label: "Y-o-Y Growth",
    data: ulbSubData,
    customHoverLabels,
    backgroundColor: [LINE_COLOR],
    borderColor: LINE_COLOR,
    fill: false,
  });

  chartData.push({
    type: "bar",
    label: totalData.ulbLedgerData[0]?.label || "ULB Data",
    data: [...ulbSubData],
    backgroundColor: [GRAPH_COLORS[0]],
  });

  // Handle comparison datasets
  if (Array.isArray(totalData.compareResults)) {
    totalData.compareResults.forEach((resultSet, index) => {
      const comparisonData = new Array(years.length).fill(null);
      for (const dataPoint of resultSet) {
        if (dataPoint && yearIndexMap.hasOwnProperty(dataPoint.year)) {
          comparisonData[yearIndexMap[dataPoint.year]] =
            dataPoint.weightedAverageCr;
        }
      }

      chartData.push({
        type: "bar",
        label: resultSet[0]?.label || `Comparison ${index + 1}`,
        data: comparisonData,
        backgroundColor: [GRAPH_COLORS[(index + 1) % GRAPH_COLORS.length]],
      });
    });
  }

  // 4 because: only 3 years data has to be shown.
  const ulbCagr = Math.round(getCagr(chartData[0].data, 4), 0);
  const ulbName = chartData[1].label;
  const yr1 = `FY${years[0]}`;
  const yr2 = `FY${years[years.length - 1]}`;
  const amt1Msg = formatAmount(chartData[0].data[0]);
  const amt2Msg = formatAmount(chartData[0].data[chartData[0].data.length - 1]);
  const cagrMsg =
    typeof ulbCagr === "number" &&
    !isNaN(ulbCagr) &&
    Math.abs(ulbCagr) !== Infinity
      ? `CAGR of ${ulbCagr}% between ${yr1} and ${yr2}`
      : "CAGR cannot be computed";
  const msg = `${cagrMsg} (${ulbName} numbers for ${yr1} is ${amt1Msg}, and for ${yr2} is ${amt2Msg}.)`;

  return {
    chartType: "barChart",
    labels: years,
    legendColors: [],
    axes: { x: "Years", y: "Amt in ₹ Cr" },
    data: chartData,
    info: {
      text: ulbCagr >= 0 ? "success" : "danger",
      msg,
    },
  };
}

// 🚀 Main API
module.exports.getaverageCompareByIndicators = async (req, res) => {
  try {
    const { years, compareType, ulbId, lineItem } = req.body;

    if (!Array.isArray(years) || years.length === 0)
      return res.status(400).json({ message: "years is required" });

    if (!ulbId || !lineItem)
      return res
        .status(400)
        .json({ message: "ulbId and lineItem are required" });

    const ulbData = await ulb.findById(ulbId).lean();
    if (!ulbData) return res.status(404).json({ message: "ULB not found" });

    const populationCategory = getPopulationCategory(ulbData.population);

    const compareIdMap = {
      ulb: ulbId,
      state: ulbData.state?.toString(),
      ulbType: ulbData.ulbType,
      popCat: populationCategory,
      national: "", // no filter
    };
    // console.log(
    //   "Compare ID Map:",
    //   compareIdMap,
    //   "for ULB:",
    //   ulbData.name,
    //   years,
    //   compareType,
    //   ulbId,
    //   lineItem
    // );
    // Weighted averages for ULB and comparison
    const totalData = await getWeightedAvgData(
      compareIdMap,
      lineItem,
      ulbId,
      years,
      compareType
    );
    // console.log("Total data fetched.", totalData, lineItem, years);
    data = createResStructureWeighedAvgData(totalData, lineItem, years);

    return res.status(200).json({
      success: data.success !== false,
      data,
    });
  } catch (err) {
    console.error("Error fetching weighted averages:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message,
    });
  }
};
