const LineItem = require("../../models/LineItem");
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
    const mergedResult = {
      ...totals[0],
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
    
    for (const indicator of allLineItems) {
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
    return ledgerData;
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
*
* @param {Array} totals - Array of financial totals, typically with a single object
* @returns {Object} marketDasInd - Calculated indicator values
*/
async function marketDashboardIndicators(totals) {
  try {
    if (!totals || totals.length === 0) {
      throw new Error("Totals array is empty");
    }

    const marketDasInd = {};
    const totRevenue = totals[0].totRevenue;
    const totRevenueExpenditure = totals[0].totRevenueExpenditure;
    const totAssets = totals[0].totAssets;
    const totOwnRevenue = totals[0].totOwnRevenue;
    const totDebt = totals[0].totDebt;
    const grants = totals[0].grants;

    marketDasInd.totOwnRevenueByTotRevenue =
      totRevenue !== 0 ? totOwnRevenue / totRevenue : 0;
    marketDasInd.grantsByTotRevenue =
      totRevenue !== 0 ? grants / totRevenue : 0;
      marketDasInd.totOwnRevenueByTotRevenueExpenditure =
      totRevenueExpenditure !== 0 ? totOwnRevenue / totRevenueExpenditure : 0;
    marketDasInd.totDebtByTotAssets = totAssets !== 0 ? totDebt / totAssets : 0;
    marketDasInd.totDebtByTotOwnRevenue =
      totOwnRevenue !== 0 ? totDebt / totOwnRevenue : 0;  
      
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
     const { ulbId, years } = req.query;
     console.log("ulbId:", ulbId, "years:", years);
     const yearsArray = Array.isArray(years) ? years : [years];
    if (!ulbId || !yearsArray) {
      return res.status(400).json({ message: "Missing required parameters" });
    }
    const indicators = await ledgerLog.find({ulb_id:ObjectId(ulbId), year:{$in:yearsArray}})
      .select(["ulb_id","audit_status","year","state","ulb","indicators"])
      .lean();

    if (!indicators || indicators.length === 0) {
      return res.status(404).json({ message: "No indicators found" });
    }

    res.status(200).json(indicators);
  } catch (error) {
    console.error("Error fetching city dashboard indicators:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }   
}
module.exports.accumulateIndicators = accumulateIndicators;



