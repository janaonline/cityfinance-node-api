const ledgerLog = require("../../models/LedgerLog");
const IndicatorsModel = require("../../models/ledgerIndicators");
const {
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
  getInfoHTML
} = require("./helper").default;
const mongoose = require("mongoose");

// Using ObjectId from mongoose
const { ObjectId } = mongoose.Types;

module.exports.getIndicators = async (req, res) => {
  try {
    const { ulbId, financialYear } = req.query;
    if (!ulbId || !financialYear) {
      return res.status(400).json({ message: "Missing required parameters" });
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
      allLineItems
    );

    res.status(200).json(IndicatorTotals);
  } catch (error) {
    console.error("Error fetching indicators:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

async function accumulateIndicators(ulbId, financialYear, allLineItems) {
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
      totals
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

async function marketDashboardIndicators(ulbId, financialYear, totals) {
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
    marketDasInd.capex = capexRaw; // keep original shape (number or "N/A")

    // ---------- Normalized numbers for downstream math ----------
    const rev = normalize(totRevenue);
    const operExp = normalize(OperSurplusTotRevenueExpenditure);
    const intFinChaVal = normalize(intFinCha);
    const qaRatioNumVal = normalize(qaRatioNum);
    const totRevExp = normalize(totRevenueExpenditure);
    const depreciationVal = normalize(depreciation);
    const capexVal = normalize(marketDasInd.capex);
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

    // qaRatio = qaRatioNum / (totRevenueExpenditure - depreciation)
    marketDasInd.qaRatio =
      qaRatioNumVal !== null &&
      totRevExp !== null &&
      depreciationVal !== null &&
      totRevExp - depreciationVal !== 0
        ? parseFloat((qaRatioNumVal / (totRevExp - depreciationVal)).toFixed(2))
        : "N/A";

    // totExpenditure = totRevenueExpenditure + capex  (only if both valid)
    marketDasInd.totExpenditure =
      totRevExp !== null && capexVal !== null ? totRevExp + capexVal : "N/A";

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
        ? parseFloat((marketDasInd.totExpenditure / ownRevVal) * 100).toFixed(2)
        : "N/A";

    marketDasInd.capitalExpenditureByTotExpenditure =
      capexVal !== null &&
      marketDasInd.totExpenditure !== "N/A" &&
      marketDasInd.totExpenditure !== 0
        ? parseFloat((capexVal / marketDasInd.totExpenditure) * 100).toFixed(2)
        : "N/A";
    console.log(marketDasInd, "marketDasInd");
    return marketDasInd;
  } catch (error) {
    // Centralised error reporting (re-throw so caller can handle HTTP/status, etc.)
    console.error("Error in marketDashboardIndicators:", error);
    throw error;
  }
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
      capexpenditure,
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
              name: "Total Expenditure to Total Revenue (%)",
              graphKey: "percentage",
              isParent: "true",
              yearData: getYearData(
                indicators,
                years,
                "totExpenditureByTotRevenue"
              ),
              info:getInfoHTML("totExpenditureByTotRevenue"),
              // info: "What is Own Source Revenue to Total Revenue?This metric indicates the extent to which a ULB’s revenue is generated from its own revenue sources such as property tax, rental income from municipal properties, fees and user charges, etc.A higher ratio reflects greater fiscal self-reliance and lesser dependence on inter-governmental transfers.How is it calculated? Own Source Revenue: Total Revenue",
            },
            {
              name: "Own Source Revenue to Total Revenue (%)",
              graphKey: "percentage",
              isParent: "true",
              yearData: getYearData(
                indicators,
                years,
                "totOwnRevenueByTotRevenue"
              ),
              info:getInfoHTML("totOwnRevenueByTotRevenue"),
              // info: "What is Own Source Revenue to Total Revenue?This metric indicates the extent to which a ULB’s revenue is generated from its own revenue sources such as property tax, rental income from municipal properties, fees and user charges, etc.A higher ratio reflects greater fiscal self-reliance and lesser dependence on inter-governmental transfers.How is it calculated? Own Source Revenue: Total Revenue",
            },
            {
              name: "Grants to Total Revenue (%)",
              graphKey: "percentage",
              isParent: "true",
              yearData: getYearData(indicators, years, "grantsByTotRevenue"),
              info:getInfoHTML("grantsByTotRevenue"),
              // info: "What is Grants to Total Revenue?This metric indicates the extent to which a ULB’s revenue is supplemented by inter-governmental revenue grants.A lower ratio is desirable indicating greater self-reliance and reduced dependence on inter-governmental transfers.How is it calculated?Revenue Grants / Total Revenue Income",
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
              info: "What is Grants to Total Revenue?This metric indicates the extent to which a ULB’s revenue is supplemented by inter-governmental revenue grants.A lower ratio is desirable indicating greater self-reliance and reduced dependence on inter-governmental transfers.How is it calculated?Revenue Grants / Total Revenue Income",
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
              info: "What is Grants to Total Revenue?This metric indicates the extent to which a ULB’s revenue is supplemented by inter-governmental revenue grants.A lower ratio is desirable indicating greater self-reliance and reduced dependence on inter-governmental transfers.How is it calculated?Revenue Grants / Total Revenue Income",
            },
            {
              name: "Operating Surplus (Cr)",
              graphKey: "amount",
              isParent: "true",
              yearData: getFormattedYearData(
                indicators,
                years,
                "operatingSurplus",
                formatToCrore
              ),
              yearGrowth: getYearGrowth(indicators, years, "operatingSurplus"),
              info: "Operating Surplus",
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
              name: "Total Revenue (Cr)",
              graphKey: "amount",
              isParent: "true",
              yearData: getFormattedYearData(
                indicators,
                years,
                "totRevenue",
                formatToCrore
              ),
              yearGrowth: getYearGrowth(indicators, years, "totRevenue"),
              info: "What is Total Revenue?This metric Indicates the revenue income a ULB earns or receives from tax and non-tax sources.How is it calculated?Total Revenue = Own Source Revenue + Assigned Revenue +  Grants + Others",
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
              info: "What is Total Own Source Revenue?This metric indicates a ULB's recurring expenses incurred on day-to-day functioning and operational needs. How is it calculated?Own Source Revenue = Tax Revenue + Fees and User Charges + Rental Income + Sale and Hire Charges + Income from Investments + Income Earned + Other Income",
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
              name: "Own Source Revenue to Total Revenue (%)",
              graphKey: "percentage",
              isParent: "true",
              yearData: getYearData(
                indicators,
                years,
                "totOwnRevenueByTotRevenue"
              ),
              info: "What is Own Source Revenue to Total Revenue?This metric indicates the extent to which a ULB’s revenue is generated from its own revenue sources such as property tax, rental income from municipal properties, fees and user charges, etc.A higher ratio reflects greater fiscal self-reliance and lesser dependence on inter-governmental transfers.How is it calculated? Own Source Revenue: Total Revenue",
            },
            {
              name: "Grants to Total Revenue (%)",
              graphKey: "percentage",
              isParent: "true",
              yearData: getYearData(indicators, years, "grantsByTotRevenue"),
              info: "What is Grants to Total Revenue?This metric indicates the extent to which a ULB’s revenue is supplemented by inter-governmental revenue grants.A lower ratio is desirable indicating greater self-reliance and reduced dependence on inter-governmental transfers.How is it calculated?Revenue Grants / Total Revenue Income",
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
        var response = {
          intro: intro,
          data: [
            header,
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
              info: "What is Total Revenue Expenditure?This metric indicates a ULB's recurring expenses incurred on day-to-day functioning and operational needs. How is it calculated?Revenue Expenditure = Establishment Expenses + Administrative Expenses + Operations and Maintenance + Interest and Finance Charges + Others",
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
              info: "What is Total Revenue Expenditure?This metric indicates a ULB's recurring expenses incurred on day-to-day functioning and operational needs. How is it calculated?Revenue Expenditure = Establishment Expenses + Administrative Expenses + Operations and Maintenance + Interest and Finance Charges + Others",
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
              name: "Own Source Revenue to Revenue Expenditure (%)",
              graphKey: "percentage",
              isParent: "true",
              yearData: getYearData(
                indicators,
                years,
                "totOwnRevenueByTotRevenueExpenditure"
              ),
              info: "What is Own Source Revenue to Revenue Expenditure?This metric indicates the extent to which a ULB’s revenue expenditure is funded through its Own Source Revenue. A higher ratio is desirable indicating greater self-reliance. A lower ratio indicates dependence on inter-governmental transfers to meet revenue expenditure.How is it calculated?Own Source Revenue to Revenue Expenditure = Own Source Revenue/ Revenue Expenditure",
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
              info: "What is Total Debt?This metric indicates the absolute level of financial obligations that the ULB is independently responsible for repaying.A higher value may suggest increased leverage or past investment in infrastructure, while a lower value may reflect either low borrowing capacity or a conservative fiscal approach.How is it calculated?Total Debt = Secured Loans + Unsecured Loans",
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
              info: "Total Assets",
            },
            {
              name: "Debt to Asset Ratio",
              graphKey: "percentage",
              isParent: "true",
              yearData: getYearData(indicators, years, "totDebtByTotAssets"),
              info: "What is Debt to Asset Ratio?This metric indicates a city’s extent of debt against its balance sheet size. A higher ratio indicates the ULG being highly leveraged. A lower ratio indicates the ULG's potential to borrow more, subject to its needs.How is it calculated?Debt to Asset Ratio = Total Debt/ Total Assets",
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
              info: "What is Debt to Own-Source-Revenue Ratio?This metric indicates a ULB’s financial leverage relative to its internal revenue-generating capacity.A lower ratio is desirable as they indicate that the debt levels are manageable.How is it calculated?Debt to Own-Source Revenue = Total Debt/Own Source Revenue",
            },
            {
              name: "Interest Service Coverage Ratio (ISCR)",
              graphKey: "percentage",
              isParent: "true",
              yearData: getYearData(indicators, years, "iscrRatio"),
              info: "What is Interest Service Coverage Ratio?This metric indicates a ULG's capacity to make interest payments using its operating surplus. A higher ratio is desirable indicating better liquidity. A lower ratio indicates lower capacity to make interest paymentsHow is it calculated?ISCR = Operating Surplus/ Interest and Finance Charges",
            },
            {
              name: "Quick Asset Ratio",
              graphKey: "percentage",
              isParent: "true",
              yearData: getYearData(indicators, years, "qaRatio"),
              info: "What is Quick Assets Ratio?This metric indicates a ULB’s ability to meet its short-term financial obligations with its available liquid assets. A higher ratio is desirable indicating better liquidity.How is it calculated?Quick Assets Ratio = (Cash and bank balance + all investments)/ Revenue Expenditure prior to depreciation",
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
  }
  return { value: "N/A", year: "N/A", ulb: "N/A" };
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
      } reported a total revenue of ₹${formatToCrore(
        totRevenueData.value
      )} crore and a total expenditure of ₹${formatToCrore(
        totRevenueExpenditure.value
      )} crore, implying that its expenditure accounted for ${(
        (totRevenueExpenditure.value / totRevenueData.value) *
        100
      ).toFixed(2)}% of its revenue`;
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
      console.log(cagr, "this is cagr");
      return `${totRevenueData.ulbName}’s total revenue for FY ${
        totRevenueData.year
      } was ₹${formatToCrore(totRevenueData.value)} crore.${cagr}`;
    }
    case "expenditure": {
      const totExpenditure = getIndicatorValue(
        "totExpenditure",
        finalObject,
        yearsArray
      );
      // console.log(totExpenditure,"totalexp");
      const totRevenueExpenditure = getIndicatorValue(
        "totRevenueExpenditure",
        finalObject,
        yearsArray
      );
      return `In FY ${totRevenueExpenditure.year}, ${
        totRevenueExpenditure.ulbName
      } reported a total expenditure of ₹${formatToCrore(
        totRevenueExpenditure.value
      )} crore which included total revenue expenditure of ₹${formatToCrore(
        totRevenueExpenditure.value
      )} crore`;
    }
    case "debt": {
      const debt = getIndicatorValue("totDebt", finalObject, yearsArray);
      const totAssets = getIndicatorValue("totAssets", finalObject, yearsArray);
      return `As of FY ${debt.year}, ${
        debt.ulbName
      }’s outstanding debt stood at ₹${formatToCrore(
        debt.value
      )} crore, against total assets valued at ₹${formatToCrore(
        totAssets.value
      )} crore`;
    }
    default:
      console.log("Invalid keyType");
  }
}
function getCAGRValue(revArray) {
  console.log(revArray, "this is revArray");
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
  const startCr = (startValue / 1e7).toFixed(2);
  const endCr = (endValue / 1e7).toFixed(2);
  const cagrStr = cagr.toFixed(2);

  return `Over the years from FY ${startYear} to FY ${endYear}, the city’s revenue grew from ₹${startCr} crore to ₹${endCr} crore, registering a CAGR of ${cagrStr}%.`;
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

      const cityName =
        faqData?.ulbTop?.ulb ?? faqData?.ulbMeta?.ulb ?? "N/A";
      const stateName = faqData?.stateTop?.state ?? null;

      const ulbTotRevText =
        faqData?.ulbTop?.indicators?.totRevenue != null
          ? formatToCrore(faqData.ulbTop.indicators.totRevenue)
          : "N/A";

      const nationalTotRevText =
        faqData?.national?.indicators?.totRevenue != null
          ? formatToCrore(faqData.national.indicators.totRevenue)
          : "N/A";

      const ownShareText =
        faqData?.ulbTop?.indicators?.totOwnRevenueByTotRevenue != null
          ? faqData.ulbTop.indicators.totOwnRevenueByTotRevenue
          : "N/A";

      const propTaxVal = faqData?.ulbTop?.lineItems?.["11001"];
      const propTaxText =
        propTaxVal != null ? formatToCrore(propTaxVal) : "N/A";

      const publishesSLB = stateName ? statesWithYes.has(stateName) : false;

      faqs = [
        {
          question: `How does ${cityName}’s revenue compare to other municipal cities?`,
          answer: `In FY ${year}, ${cityName} recorded a total revenue of ₹${ulbTotRevText} crore. Among cities in ${
            faqData?.stateTop?.state ?? "N/A"
          }, ${
            faqData?.stateTop?.ulb ?? "N/A"
          } had the highest revenue. Nationally, the top revenue was reported by ${
            faqData?.national?.ulb ?? "N/A"
          } at over ₹${nationalTotRevText} crore.`,
        },
        {
          question: `What are the major income sources of ${cityName}?`,
          answer: `${cityName}’s revenue comprises a mix of own-source revenues, such as property tax, user charges, and rental income, along with assigned revenues (the city's share in state taxes), and grants from the central and state governments. In FY ${year}, own-source revenues contributed approximately ${ownShareText}% of the city’s total revenue.`,
        },
        {
          question: `What is ${cityName}’s property tax collection in recent years?`,
          answer: `In FY ${year}, ${cityName} collected ₹${propTaxText} crore in property tax.`,
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
      const cityName =
        faqData?.ulbTop?.ulb ?? faqData?.ulbMeta?.ulb ?? "N/A";

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

      const revExpDen =
        Number.isFinite(faqData?.ulbTop?.indicators?.totRevenueExpenditure)
          ? faqData.ulbTop.indicators.totRevenueExpenditure
          : null;

      const adminEstabPct =
        Number.isFinite(adminEstabTotalNum) &&
        Number.isFinite(revExpDen) &&
        revExpDen > 0
          ? (adminEstabTotalNum / revExpDen) *100
          : null;
      const adminEstabPctText =
        adminEstabPct != null ? adminEstabPct.toFixed(2) : "N/A";

      const opSurplusVal =
        Number.isFinite(faqData?.ulbTop?.indicators?.operatingSurplus)
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
          answer: `In FY ${year}, grants contributed ${grantsPctText}% of ${cityName}’s total revenue, amounting to ₹${grantsAmtText} crore.`,
        },
        {
          question: `How much money does ${cityName} spend towards administrative and establishment expenditure?`,
          answer: `In FY ${year}, ${cityName} spent ₹${adminEstabTotalText} crore (${adminEstabPctText}%) of its revenue expenditure towards administrative and establishment expenses.`,
        },
        {
          question: `Does ${cityName} earn enough revenue to cover its day-to-day expenses?`,
          answer: `This is measured as operating surplus or deficit. In FY ${year}, ${cityName} recorded an operating ${opState} of ₹${opAbsText} crore. Such a ${opState} may ${
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
async function buildFaqPipeline({ year, ulbId,state }) {
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
