const dataCollection = require('../../models/dataCollections');
const lineItmeLegends = require('../../models/lineitemlegends');
// const lineItems
const {
  buildPayload,
  fetchIncomeExpenditure,
  buildDocumentsFromReports,
  asyncPool,
  addReportsToLegendMap,
  buildLegendArrayFromMap


} = require("./helper");


module.exports.getApScriptData = async (req, res) => {
  try {
    const ulbs = Array.isArray(req.body?.ulbs) ? req.body.ulbs : [];

    if (!ulbs.length) {
      return res.status(400).json({
        success: false,
        message: "ulbs[] is required",
      });
    }

    if (ulbs.length > 130) {
      return res.status(400).json({
        success: false,
        message: "Max 130 ULBs allowed per request",
      });
    }

    const yearIdPrev = "606aafcf4dff55e6c075d424"; // 2023-24
    const yearIdCurr = "606aafda4dff55e6c075d48f"; // 2024-25
    // 606aadac4dff55e6c075c507 // 2020-21
    // 606aaf854dff55e6c075d219 // 2021-22
    // 606aafb14dff55e6c075d3aec // 2022-23
    // 606aafda4dff55e6c075d48f // 2025-26

    const basePayload = {
      majorCodes: [
        "110", "120", "130", "140", "150", "160",
        "170", "171", "180", "210", "220", "230",
        "240", "250", "260", "271", "272", "280",
      ],
    "startDate": "2025-04-01",
    "endDate": "2026-03-31",
    "prevStartDate": "2024-04-01",
    "prevEndDate": "2025-03-31"
    };

    const CONCURRENCY = Number(process.env.INCOME_EXP_CONCURRENCY || 5);
    const legendMap = new Map();
    const settled = await asyncPool(CONCURRENCY, ulbs, async (ulb) => {
      if (!ulb?.ulbId || !ulb?.ulbCode) {
        throw new Error("Each ulb must contain ulbId and ulbCode");
      }

      const payload = {
        ...basePayload,
        ulbCode: String(ulb.ulbCode),
      };

      const apiData = await fetchIncomeExpenditure(payload);

      if (apiData?.status !== "SUCCESS") {
        throw new Error(`External API status not SUCCESS for ulbCode=${ulb.ulbCode}`);
      }
      addReportsToLegendMap(legendMap, apiData.reports);

      return buildDocumentsFromReports({
        ulbId: ulb.ulbId,
        yearIdPrev,
        yearIdCurr,
        reports: apiData.reports,
      });
    });

    const transformedDocuments = [];
    const failures = [];

    for (let i = 0; i < settled.length; i++) {
      const result = settled[i];
      const ulb = ulbs[i];

      if (result.status === "fulfilled") {
        transformedDocuments.push(...result.value);
      } else {
        failures.push({
          ulbId: ulb?.ulbId,
          ulbCode: ulb?.ulbCode,
          error: result.reason?.message || String(result.reason),
        });
      }
    }

    if (!transformedDocuments.length) {
      return res.status(500).json({
        success: false,
        message: "No documents were transformed successfully",
        failures,
      });
    }
  const legendDocuments = buildLegendArrayFromMap(legendMap);
  console.log(`Unique GL/Major codes in legend: ${legendDocuments.length}`);  
    const bulkOps = transformedDocuments.map((doc) => ({
      updateOne: {
        filter: {
          ulbId: doc.ulbId,
          yearId: doc.yearId,
        },
        update: {
          $set: {
            lineItems: doc.lineItems,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            ulbId: doc.ulbId,
            yearId: doc.yearId,
            createdAt: new Date(),
          },
        },
        upsert: true,
      },
    }));

     // Bulk upsert legends as flat records
    const legendBulkOps = legendDocuments.map((legend) => ({
      updateOne: {
        filter: {
          majorCode: legend.majorCode,
          subCode: legend.subCode,
        },
        update: {
          $set: {
            name: legend.name,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            majorCode: legend.majorCode,
            subCode: legend.subCode,
            createdAt: new Date(),
          },
        },
        upsert: true,
      },
    }));
     
     const [bulkResult, legendBulkResult] = await Promise.all([
      dataCollection.bulkWrite(bulkOps, { ordered: false }),
      legendBulkOps.length
        ? lineItmeLegends.bulkWrite(legendBulkOps, { ordered: false })
        : Promise.resolve({
            matchedCount: 0,
            modifiedCount: 0,
            upsertedCount: 0,
          }),
    ]);
    // const bulkResult = await dataCollection.bulkWrite(bulkOps, {
    //   ordered: false,
    // });


    return res.status(200).json({
      success: failures.length === 0,
      totalRequestedUlbs: ulbs.length,
      totalSucceededUlbs: ulbs.length - failures.length,
      totalFailedUlbs: failures.length,

      transformedDocumentsCount: transformedDocuments.length,
      legendDocumentsCount: legendDocuments.length,

      dataUpsertSummary: {
        matchedCount: bulkResult.matchedCount || 0,
        modifiedCount: bulkResult.modifiedCount || 0,
        upsertedCount: bulkResult.upsertedCount || 0,
      },
       legendUpsertSummary: {
        matchedCount: legendBulkResult.matchedCount || 0,
        modifiedCount: legendBulkResult.modifiedCount || 0,
        upsertedCount: legendBulkResult.upsertedCount || 0,
      },

      failures,
    });
  } catch (error) {
    console.log("Error in getApScriptData:", error?.response?.data || error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
