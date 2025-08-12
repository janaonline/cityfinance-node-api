const ledgerLog = require("../../models/LedgerLog");
const IndicatorsModel = require("../../models/ledgerIndicators");
const {
  totRevenue,
  totRevenueExpenditure,
  totOwnRevenue,
  totDebt,
  grants,
  totAssets,
  OperSurplusTotRevenueExpenditure,
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
    const marketDashboardInd = await marketDashboardIndicators(totals);
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
const convertLedgerData = (data) => {
  return data.map((item) => {
    const convertedItem = {};
    for (let key in item) {
      convertedItem[key] = item[key] === 0 ? "N/A" : item[key]; // If value is 0, replace with 'N/A'
    }
    return convertedItem;
  });
};
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

async function marketDashboardIndicators(totals) {
  try {
    if (!totals || totals.length === 0) {
      throw new Error("Totals array is empty");
    }
    const marketDasInd = {};
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
    // Utility: Normalize values (converts "N/A" and null/undefined to null)
    const normalize = (val) => {
      if (val === "N/A" || val == null) return null;
      const num = parseFloat(val);
      return isNaN(num) ? null : num;
    };

    // Utility: Safe division
    const safeDivide = (numerator, denominator) => {
      const num = normalize(numerator);
      const den = normalize(denominator);

      if (num === null || den === null || den === 0) return null;
      return num / den;
    };

    // Utility: Percentage formatter
    const safePercent = (numerator, denominator, decimals = 2) => {
      const ratio = safeDivide(numerator, denominator);
      return ratio === null
        ? "N/A"
        : parseFloat((ratio * 100).toFixed(decimals));
    };

    // Utility: Ratio (no *100)
    const safeRatio = (numerator, denominator, decimals = 2) => {
      const ratio = safeDivide(numerator, denominator);
      return ratio === null ? "N/A" : parseFloat(ratio.toFixed(decimals));
    };

    // Assign computed values
    marketDasInd.totOwnRevenueByTotRevenue = safePercent(
      totOwnRevenue,
      totRevenue
    );
    marketDasInd.grantsByTotRevenue = safePercent(grants, totRevenue);
    marketDasInd.totOwnRevenueByTotRevenueExpenditure = safePercent(
      totOwnRevenue,
      totRevenueExpenditure
    );
    marketDasInd.totDebtByTotAssets = safeRatio(totDebt, totAssets);
    marketDasInd.totDebtByTotOwnRevenue = safeRatio(totDebt, totOwnRevenue);

    // Operating Surplus (special case: subtraction)
    const rev = normalize(totRevenue);
    const operExp = normalize(OperSurplusTotRevenueExpenditure);
    const intFinChaVal = normalize(intFinCha);
    const qaRatioNumVal = normalize(qaRatioNum);
    const totRevExp = normalize(totRevenueExpenditure);
    const depreciationVal = normalize(depreciation);
    marketDasInd.operatingSurplus =
      rev !== null && operExp !== null ? rev - operExp : "N/A";
    marketDasInd.iscrRatio =
      rev !== null &&
      operExp !== null &&
      intFinChaVal !== null &&
      intFinChaVal !== 0
        ? parseFloat(((rev - operExp) / intFinChaVal).toFixed(2))
        : "N/A";
    marketDasInd.qaRatio =
      qaRatioNumVal !== null &&
      totRevExp !== null &&
      depreciationVal !== null &&
      totRevExp - depreciationVal !== 0
        ? parseFloat((qaRatioNumVal / (totRevExp - depreciationVal)).toFixed(2))
        : "N/A";
    return marketDasInd;
  } catch (error) {
    console.error("Error in marketDashboardIndicators:", error);
    throw error;
  }
}

module.exports.createIndicators = async (req, res) => {
  try {
    // List of indicators you want to ensure are present
    const indicatorsList = [
      totRevenue,
      totRevenueExpenditure,
      totOwnRevenue,
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
      console.log("ulbId:", ulbId, "years:", years);
    const yearsArray = Array.isArray(years) ? years : [years];
    if (!ulbId || !yearsArray || !keyType) {
      return res.status(400).json({ message: "Missing required parameters" });
    }
    const indicators = await ledgerLog
      .find({ ulb_id: ObjectId(ulbId), year: { $in: yearsArray } })
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

    const header = {
      name: "Indicators",
      yearData: yearsArray,
      className: "fw-bold ",
      isHeader: true,
    };
    // console.log(header, "this is header");
    var params = indicators.map(({ lineItems, ...rest }) => rest);
    const source = buildSourceStatement(params);
    // console.log(source,'this is source')
    var intro = await getIntro(params, keyType, yearsArray);

    if (keyType === "overview") {
      var response = {
        intro: intro,
        data: [
          header,
          {
            name: "Own Source revenue to Total Revenue (%)",
            yearData: [0, 1, 2].map(
              (i) =>
                indicators?.[i]?.indicators?.totOwnRevenueByTotRevenue ?? "N/A"
            ),
            yearGrowth: ['', '89', '-90',],
            info:'What is Own Source Revenue to Total Revenue?This metric indicates the extent to which a ULB’s revenue is generated from its own revenue sources such as property tax, rental income from municipal properties, fees and user charges, etc.A higher ratio reflects greater fiscal self-reliance and lesser dependence on inter-governmental transfers.How is it calculated? Own Source Revenue: Total Revenue',
          },
          {
            name: "Grants to Total Revenue (%)",
            yearData: [0, 1, 2].map(
              (i) => indicators?.[i]?.indicators?.grantsByTotRevenue ?? "N/A"
            ),
            info: "What is Grants to Total Revenue?This metric indicates the extent to which a ULB’s revenue is supplemented by inter-governmental revenue grants.A lower ratio is desirable indicating greater self-reliance and reduced dependence on inter-governmental transfers.How is it calculated?Revenue Grants / Total Revenue Income",
          },
          {
            name: "Operating Surplus(Cr)",
            yearData: [0, 1, 2].map(
              // (i) => indicators?.[i]?.indicators?.operatingSurplus ?? "N/A"
              (i) =>{
                const value = indicators?.[i]?.indicators?.operatingSurplus ?? "N/A"
                return formatToCrore(value);
              }
            ),
            info: "Operating Surplus",
          },
        ],
      };
    }
    if (keyType === "revenue") {
      var response = {
        intro: intro,
        data: [
          header,
          {
            name: "Total Revenue(Cr)",
            yearData: [0, 1, 2].map(
              (i) => {
                const value = indicators?.[i]?.indicators?.totRevenue ?? "N/A"
                return formatToCrore(value);
              }
              // (i) => indicators?.[i]?.indicators?.totRevenue ?? "N/A"
            ),
            info: "What is Total Revenue?This metric Indicates the revenue income a ULB earns or receives from tax and non-tax sources.How is it calculated?Total Revenue = Own Source Revenue + Assigned Revenue +  Grants + Others",
            children: [
              {
                name: "Own Source Revenue(Cr)",
                yearData: [0, 1, 2].map(
                  // (i) => indicators?.[i]?.indicators?.totOwnRevenue ?? "N/A"
                  (i) => {
                const value = indicators?.[i]?.indicators?.totOwnRevenue ?? "N/A"
                return formatToCrore(value);
              }
                ),
                // info: "Own Source Revenue",
                className: "ps-5 ",
              },
              {
                name: "Assigned Revenue(Cr)",
                yearData: [0, 1, 2].map(
                  (i) => {
                const value = indicators?.[i]?.lineItems?.["120"] ?? "N/A"
                return formatToCrore(value);
              }
                  // (i) => indicators?.[i]?.lineItems?.["120"] ?? "N/A"
                ),
                // info: "Assigned Revenue",
                className: "ps-5 ",
              },
              {
                name: "Revenue Grants(Cr)",
                yearData: [0, 1, 2].map(
                  (i) => {
                const value = indicators?.[i]?.lineItems?.["160"] ?? "N/A"
                return formatToCrore(value);
              }
                  // (i) => indicators?.[i]?.lineItems?.["160"] ?? "N/A"
                ),
                // info: "Revenue Grants",
                className: "ps-5 ",
              },
              {
                name: "Others(Cr)",
                yearData: [0, 1, 2].map(
                  (i) => {
                const value = indicators?.[i]?.lineItems?.["100"] ?? "N/A"
                return formatToCrore(value);
              }
                  // (i) => indicators?.[i]?.lineItems?.["100"] ?? "N/A"
                ),
                // info: "Others",
                className: "ps-5 ",
              },
            ],
          },
          {
            name: "Total Own Source Revenue(Cr)",
            yearData: [0, 1, 2].map(
              (i) => {
                const value = indicators?.[i]?.indicators?.totOwnRevenue ?? "N/A"
                return formatToCrore(value);
              }
              // (i) => indicators?.[i]?.indicators?.totOwnRevenue ?? "N/A"
            ),
            info: "What is Total Own Source Revenue?This metric indicates a ULB's recurring expenses incurred on day-to-day functioning and operational needs. How is it calculated?Own Source Revenue = Tax Revenue + Fees and User Charges + Rental Income + Sale and Hire Charges + Income from Investments + Income Earned + Other Income",
            children: [
              {
                name: "Tax Revenue(Cr)",
                yearData: [0, 1, 2].map(
                  (i) => {
                const value = indicators?.[i]?.lineItems?.["110"] ?? "N/A"
                return formatToCrore(value);
              }
                  // (i) => indicators?.[i]?.lineItems?.["110"] ?? "N/A"
                ),
                // info: "Tax Revenue",
                className: "ps-5 ",
              },
              {
                name: "Rental Income(Cr)",
                yearData: [0, 1, 2].map(
                  // (i) => indicators?.[i]?.lineItems?.["130"] ?? "N/A"
                  (i) =>  {
                const value = indicators?.[i]?.lineItems?.["130"] ?? "N/A"
                return formatToCrore(value);
              }
                ),
                // info: "Rental Income",
                className: "ps-5 ",
              },
              {
                name: "Fee & User Charges(Cr)",
                yearData: [0, 1, 2].map(
                  (i) => {
                const value = indicators?.[i]?.lineItems?.["140"] ?? "N/A"
                return formatToCrore(value);
              }
                  // (i) => indicators?.[i]?.lineItems?.["140"] ?? "N/A"
                ),
                // info: "Fee & User Charges",
                className: "ps-5 ",
              },
              {
                name: "Sale & Hire Charges(Cr)",
                yearData: [0, 1, 2].map(
                  // (i) => indicators?.[i]?.lineItems?.["150"] ?? "N/A"
                  (i) => {
                const value = indicators?.[i]?.lineItems?.["150"] ?? "N/A"
                return formatToCrore(value);
              }
                ),
                // info: "Sale & Hire Charges",
                className: "ps-5 ",
              },
              {
                name: "Other Income(Cr)",
                yearData: [0, 1, 2].map(
                  (i) => {
                const value =indicators?.[i]?.lineItems?.["180"] ?? "N/A"
                return formatToCrore(value);
              }
                  // (i) => indicators?.[i]?.lineItems?.["180"] ?? "N/A"
                ),
                // info: "Other Income",
                className: "ps-5 ",
              },
              {
                name: "Income from Investment(Cr)",
                yearData: [0, 1, 2].map(
                  (i) => {
                const value =indicators?.[i]?.lineItems?.["170"] ?? "N/A"
                return formatToCrore(value);
              }
                ),
                // info: "Interest Earned",
                className: "ps-5 ",
              },
              {
                name: "Interest Earned(Cr)",
                yearData: [0, 1, 2].map(
                  (i) => {
                const value =indicators?.[i]?.lineItems?.["171"] ?? "N/A"
                return formatToCrore(value);
              }
                ),
                // info: "Interest Earned",
                className: "ps-5 ",
              },
               
            ],
          },
          {
            name: "Own Source revenue to Total Revenue (%)",
            yearData: [0, 1, 2].map(
              (i) =>
                indicators?.[i]?.indicators?.totOwnRevenueByTotRevenue ?? "N/A"
            ),
            info:'What is Own Source Revenue to Total Revenue?This metric indicates the extent to which a ULB’s revenue is generated from its own revenue sources such as property tax, rental income from municipal properties, fees and user charges, etc.A higher ratio reflects greater fiscal self-reliance and lesser dependence on inter-governmental transfers.How is it calculated? Own Source Revenue: Total Revenue',
          },
          {
            name: "Grants to Total Revenue (%)",
            yearData: [0, 1, 2].map(
              (i) => indicators?.[i]?.indicators?.grantsByTotRevenue ?? "N/A"
            ),
            info: "What is Grants to Total Revenue?This metric indicates the extent to which a ULB’s revenue is supplemented by inter-governmental revenue grants.A lower ratio is desirable indicating greater self-reliance and reduced dependence on inter-governmental transfers.How is it calculated?Revenue Grants / Total Revenue Income",
          },
        ],
      };
    }
    if (keyType === "expenditure") {
      var response = {
        intro: intro,
        data: [
          header,
          {
            name: "Total Revenue Expenditure(Cr)",
            yearData: [0, 1, 2].map(
              (i) =>{
                const value = indicators?.[i]?.indicators?.totRevenueExpenditure ?? "N/A"
                return formatToCrore(value);
              }
              // (i) => indicators?.[i]?.indicators?.totRevenueExpenditure ?? "N/A"
            ),
            info: "What is Total Revenue Expenditure?This metric indicates a ULB's recurring expenses incurred on day-to-day functioning and operational needs. How is it calculated?Revenue Expenditure = Establishment Expenses + Administrative Expenses + Operations and Maintenance + Interest and Finance Charges + Others",
            children: [
              {
                name: "Establishment Expenses(Cr)",
                yearData: [0, 1, 2].map(
                  (i) => {
                const value = indicators?.[i]?.lineItems?.["210"] ?? "N/A"
                return formatToCrore(value);
              }
                  // (i) => indicators?.[i]?.lineItems?.["210"] ?? "N/A"
                ),
                // info: "Establishment Expenses",
                className: "ps-5 ",
              },
              {
                name: "Administrative Expenses(Cr)",
                yearData: [0, 1, 2].map(
                  (i) =>  {
                const value = indicators?.[i]?.lineItems?.["220"] ?? "N/A"
                return formatToCrore(value);
              }
                  // (i) => indicators?.[i]?.lineItems?.["220"] ?? "N/A"
                ),
                // info: "Administrative Expenses",
                className: "ps-5 ",
              },
              {
                name: "O&M Expenses(Cr)",
                yearData: [0, 1, 2].map(
                  (i) =>  {
                const value = indicators?.[i]?.lineItems?.["230"] ?? "N/A"
                return formatToCrore(value);
              }
                  // (i) => indicators?.[i]?.lineItems?.["230"] ?? "N/A"
                ),
                // info: "O&M Expenses",
                className: "ps-5 ",
              },
              {
                name: "Interest Charges(Cr)",
                yearData: [0, 1, 2].map(
                  (i) =>  {
                const value = indicators?.[i]?.lineItems?.["240"] ?? "N/A"
                return formatToCrore(value);
              }
                  // (i) => indicators?.[i]?.lineItems?.["240"] ?? "N/A"
                ),
                // info: "Interest Charges",
                className: "ps-5 ",
              },
              {
                name: "Others(Cr)",
                yearData: [0, 1, 2].map((i) => {
                  const keys = [
                    "250",
                    "260",
                    "270",
                    "271",
                    "272",
                    "280",
                    "290",
                    "200",
                  ];
                  const values = keys.map(
                    (k) => indicators?.[i]?.lineItems?.[k]
                  );
                  if (values.every((v) => v == null)) {
                    return "N/A";
                  }
                  const total =values.reduce((acc, v) => acc + (v ?? 0), 0);
                  return formatToCrore(total); 
                }),
                // info: "Other incomes including grants, assignments, and miscellaneous receipts",
                className: "ps-5 ",
              },
            ],
          },
          {
            name: "Own Source Revenue to Revenue Expenditure(%)",
            yearData: [0, 1, 2].map(
              (i) =>
                indicators?.[i]?.indicators
                  ?.totOwnRevenueByTotRevenueExpenditure ?? "N/A"
            ),
            info: "What is Own Source Revenue to Revenue Expenditure?This metric indicates the extent to which a ULB’s revenue expenditure is funded through its Own Source Revenue. A higher ratio is desirable indicating greater self-reliance. A lower ratio indicates dependence on inter-governmental transfers to meet revenue expenditure.How is it calculated?Own Source Revenue to Revenue Expenditure = Own Source Revenue/ Revenue Expenditure",
          },
        ],
      };
    }
    if (keyType === "debt") {
      var response = {
        intro: intro,
        data: [
          header,
          {
            name: "Total Debt(Cr)",
            yearData: [0, 1, 2].map(
              (i) => {
                const value = indicators?.[i]?.indicators?.totDebt ?? "N/A"
                return formatToCrore(value);
              }
              // (i) => indicators?.[i]?.indicators?.totDebt ?? "N/A"
            ),
            info: "What is Total Debt?This metric indicates the absolute level of financial obligations that the ULB is independently responsible for repaying.A higher value may suggest increased leverage or past investment in infrastructure, while a lower value may reflect either low borrowing capacity or a conservative fiscal approach.How is it calculated?Total Debt = Secured Loans + Unsecured Loans",
            children: [
              {
                name: "Secured Loans(Cr)",
                yearData: [0, 1, 2].map(
                  (i) => {
                const value = indicators?.[i]?.lineItems?.["330"] ?? "N/A"
                return formatToCrore(value);
              }
                  // (i) => indicators?.[i]?.lineItems?.["330"] ?? "N/A"
                ),
                // info: "Secured Loans",
                className: "ps-5 ",
              },
              {
                name: "Unsecured Loans(Cr)",
                yearData: [0, 1, 2].map(
                  (i) =>{
                const value = indicators?.[i]?.lineItems?.["331"] ?? "N/A"
                return formatToCrore(value);
              }
                  // (i) => indicators?.[i]?.lineItems?.["331"] ?? "N/A"
                ),
                // info: "Unsecured Loans",
                className: "ps-5 ",
              },
            ],
          },
          {
            name: "Total Assets(Cr)",
            yearData: [0, 1, 2].map(
              (i) =>{
                const value = indicators?.[i]?.indicators?.totAssets ?? "N/A"
                return formatToCrore(value);
              }
              // (i) => indicators?.[i]?.indicators?.totAssets ?? "N/A"
            ),
            info: "Total Assets",
          },
          {
            name: "Debt to Asset Ratio",
            yearData: [0, 1, 2].map(
              (i) => indicators?.[i]?.indicators?.totDebtByTotAssets ?? "N/A"
            ),
            info: "What is Debt to Asset Ratio?This metric indicates a city’s extent of debt against its balance sheet size. A higher ratio indicates the ULG being highly leveraged. A lower ratio indicates the ULG's potential to borrow more, subject to its needs.How is it calculated?Debt to Asset Ratio = Total Debt/ Total Assets",
          },
          {
            name: "Debt-to-Own Source Revenue Ratio",
            yearData: [0, 1, 2].map(
              (i) =>
                indicators?.[i]?.indicators?.totDebtByTotOwnRevenue ?? "N/A"
            ),
            info: "What is Debt to Own-Source-Revenue Ratio?This metric indicates a ULB’s financial leverage relative to its internal revenue-generating capacity.A lower ratio is desirable as they indicate that the debt levels are manageable.How is it calculated?Debt to Own-Source Revenue = Total Debt/Own Source Revenue",
          },
          {
            name: "Interest Service Coverage Ratio (ISCR)",
            yearData: [0, 1, 2].map(
              (i) => indicators?.[i]?.indicators?.iscrRatio ?? "N/A"
            ),
            info: "What is Interest Service Coverage Ratio?This metric indicates a ULG's capacity to make interest payments using its operating surplus. A higher ratio is desirable indicating better liquidity. A lower ratio indicates lower capacity to make interest paymentsHow is it calculated?ISCR = Operating Surplus/ Interest and Finance Charges",
          },
          {
            name: "Quick Asset Ratio",
            yearData: [0, 1, 2].map(
              (i) => indicators?.[i]?.indicators?.qaRatio ?? "N/A"
            ),
            info:"What is Quick Assets Ratio?This metric indicates a ULB’s ability to meet its short-term financial obligations with its available liquid assets. A higher ratio is desirable indicating better liquidity.How is it calculated?Quick Assets Ratio = (Cash and bank balance + all investments)/ Revenue Expenditure prior to depreciation",
          },
        ],
      };
    }
    res.status(200).json({ source, response });
  } catch (error) {
    console.error("Error fetching city dashboard indicators:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
function formatToCrore(value) {
  if (typeof value === "number" && !isNaN(value)) {
    if (Number.isInteger(value)) {
      return (value / 10000000).toFixed(2); // Convert absolute numbers to crores
    }
    return value; // Leave decimal numbers as is
  }
  return value; // If it's 'N/A' or not a number, return as is
}
function filterIndicatorsWithYear(indicatorsData) {
  return indicatorsData.map((data) => {
    //  console.log(data,'tis oasc dv')
    const { year, indicators, ulb } = data;
    // Create a new object where we filter out keys with "N/A" values
    const filteredIndicators = Object.entries(indicators)
      .filter(([key, value]) => value !== "N/A" && !isNaN(Number(value))) // Remove "N/A" and invalid values
      .reduce((acc, [key, value]) => {
        acc[key] = value; // Add valid key-value pair to the accumulator
        return acc;
      }, {});
    // console.log({ulb, year, indicators: filteredIndicators },'this is blah');
    return { ulb, year, indicators: filteredIndicators };
  });
}

function getIndicatorValue(indicatorKey, data, yearsArray) {
  const years = yearsArray;
  const reversedYears = years.reverse();
  // console.log(years,'this is years')
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
  // console.log(indicators,keyType,yearsArray,'this is key')
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
      return `In FY ${totRevenueData.year}, ${
        totRevenueData.ulbName
      } reported a total revenue of ₹${formatToCrore(totRevenueData.value)} crore and a total expenditure of ₹${formatToCrore(totRevenueExpenditure.value)} crore, implying that its expenditure accounted for ${(
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
      return `${totRevenueData.ulbName}’s total revenue for FY ${
        totRevenueData.year
      } was ₹${formatToCrore(totRevenueData.value)} crore.Over the three years from FY ${
        revPayload[0].year
      } to FY ${revPayload[2]?.year ?? "N/A"} the city’s revenue grew from ₹${
        formatToCrore(revPayload[0].totRevenue)
      } crore to ₹${
        formatToCrore(revPayload[2]?.totRevenue ?? "N/A")
      } crore, registering a CAGR of 7%.`;
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
      // In FY 2022–23, Indore reported a total expenditure of ₹1,620 crore, which included ₹XXX crore in revenue expenditure
      // In FY 2022–23, Indore reported a total expenditure of ₹1,620 crore, which included ₹XXX crore in revenue expenditure
      // console.log(totRevenueExpenditure, "totalrevexp");
      return `In FY ${totRevenueExpenditure.year}, ${
        totExpenditure.ulbName
      } reported a total expenditure of ₹${formatToCrore(totExpenditure.value)}crore which included total revenue expenditure of ₹${formatToCrore(totRevenueExpenditure.value)} crore`;
    }
    case "debt": {
      const debt = getIndicatorValue("totDebt", finalObject, yearsArray);
      const totAssets = getIndicatorValue("totAssets", finalObject, yearsArray);
      return `As of FY ${debt.year}, ${
        debt.ulbName
      }’s outstanding debt stood at ₹${formatToCrore(debt.value)} crore, against total assets valued at ₹${formatToCrore(totAssets.value)} crore`;
    }
    default:
      console.log("Invalid keyType");
  }
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
  console.log(req.query, "this is params");
  const ulbId = req.query;
  const yearDropdown = await ledgerLog.aggregate([
    {
      $match: {
        ulb_id: ObjectId("5f5610b3aab0f778b2d2cac0"),
        lineItems: { $ne: null },
      },
    },
    {
      $project: {
        year: 1,
      },
    },
  ]);
  const years = yearDropdown.map(({ year }) => String(year)).filter(Boolean).reverse();
  res.status(200).json({ years });
};
module.exports.getFaqs = async (req, res) => {
  try {
    const { year, ulbId, state } = req.query;

    if (!year) return res.status(400).json({ error: "year is required" });
    // National level data
    const national = await getTotRevenueDataFaq(year, null, null);
    const topNational = national[0]; // Assuming sorted in ascending order
    // console.log(topNational,'this is national1');
    // State level data
    let stateData = [];
    let topState = null;
    if (state) {
      stateData = await getTotRevenueDataFaq(year, null, state);
      //  console.log(stateData[0],'this is national2');
      topState = stateData[0];
    }

    // ULB level data
    let ulbData = [];
    if (ulbId) {
      ulbData = await getTotRevenueDataFaq(year, ulbId, null);
      //  console.log(ulbData[0],'this is national3');
    }

    const responseText1 = `In FY ${year}, ${
      ulbData.length ? ulbData[0].ulb : "a city"
    } recorded a total revenue of ${
      ulbData.length ? formatToCrore(ulbData[0].indicators.totRevenue) : "N/A"
    } crore. Among cities in ${
      topState ? topState.state : "the selected state"
    }, ${
      topState ? topState.ulb : "N/A"
    } had the highest revenue. Nationally, the top revenue was reported by ${
      topNational ? topNational.ulb : "N/A"
    } at over ${
      topNational ? formatToCrore(topNational.indicators.totRevenue) : "N/A"
    } crore.`;

    const faqs = [
      {
        question:
          "How does " +
          ulbData[0].ulb +
          "’s revenue compare to other municipal cities?",
        answer: responseText1,
      },
      {
        question:
          "What are the major income sources of " + ulbData[0].ulb + "?",
        answer:
          ulbData[0].ulb +
          "’s revenue comprises a mix of own-source revenues, such as property tax, user charges, and rental income, along with assigned revenues (the city's share in state taxes), and grants from the central and state governments. In FY " +
          year +
          ", own-source revenues contributed approximately " +
          formatToCrore(ulbData[0].indicators.totOwnRevenueByTotRevenue) +
          "% of the city’s total revenue.",
      },
      {
        question:
          "What is " +
          ulbData[0].ulb +
          "’s property tax collection in recent years?",
        answer:
          "In FY " +
            year +
            ", the " +
            ulbData[0].ulb +
            " collected ₹" +
           formatToCrore(ulbData[0]?.lineItems[11001]) ?? "N/A" + " crore in property tax.",
      },
    ];
    return res.json({ faqs: faqs });
  } catch (err) {
    console.error("Error in getFaqs:", err);
    return res.status(500).json({ error: err.message });
  }
};

async function getTotRevenueDataFaq(year, ulbId = null, state = null) {
  const match = {
    year: year,
    "indicators.totRevenue": {
      $exists: true,
      $nin: [null, "N/A"],
    },
  };

  if (ulbId) match.ulb_id = new ObjectId(ulbId);
  if (state) match.state = state;
  const pipeline = [
    { $match: match },
    {
      $project: {
        ulb: 1,
        "indicators.totRevenue": 1,
        "indicators.totOwnRevenueByTotRevenue": 1,
        "lineItems.11001": 1,
        year: 1,
        state: 1,
      },
    },
    { $sort: { "indicators.totRevenue": -1 } },
  ];

  return await ledgerLog.aggregate(pipeline);
}

module.exports.accumulateIndicators = accumulateIndicators;
