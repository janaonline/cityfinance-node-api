// const lineItems = require('../../models/LineItem');
const {
  buildPayload,
  fetchIncomeExpenditure,
  buildDocumentsFromReports,
  asyncPool
} = require("./helper");

module.exports.getApScriptData = async (req, res) => {
   try {
    const ulbs = Array.isArray(req.body?.ulbs) ? req.body.ulbs : [];

    if (ulbs.length === 0) {
      return res.status(400).json({
        success: false,
        message: "ulbs[] is required. Example: [{ ulbId, ulbCode }...]",
      });
    }

    // You asked for 5 ULBs (can allow more, but limit for safety)
    if (ulbs.length > 10) {
      return res.status(400).json({
        success: false,
        message: "Max 10 ULBs per request.",
      });
    }

    const yearIdPrev = "606aafc14dff55e6c075d3ec"; // 2023-24
    const yearIdCurr = "606aafcf4dff55e6c075d424"; // 2024-25

    // payload base (keep your majorCodes here)
    const basePayload = {
      majorCodes: [
        "110", "120", "130", "140", "150", "160",
        "170", "171", "180", "210", "220", "230",
        "240", "250", "260", "271","270", "272", "280",
      ],
         "startDate": "2024-04-01",
         "endDate": "2025-03-31",
         "prevStartDate": "2023-04-01",
         "prevEndDate": "2024-03-31"
    };

    // Concurrency limit (important for production)
    const CONCURRENCY = Number(process.env.INCOME_EXP_CONCURRENCY || 3);

    const results = await asyncPool(CONCURRENCY, ulbs, async (u) => {
      if (!u?.ulbId || !u?.ulbCode) {
        throw new Error("Missing ulbId or ulbCode");
      }

      const payload = { ...basePayload, ulbCode: String(u.ulbCode) };
      const apiData = await fetchIncomeExpenditure(payload);

      if (apiData?.status !== "SUCCESS") {
        throw new Error(`External API status not SUCCESS (ulbCode=${u.ulbCode})`);
      }

      const docs = buildDocumentsFromReports({
        ulbId: u.ulbId,
        yearIdPrev,
        yearIdCurr,
        reports: apiData.reports,
      });

      // return per ULB result
      return {
        ulbId: u.ulbId,
        ulbCode: u.ulbCode,
        documents: docs, // 2 docs
      };
    });

    // Split successes/failures + flatten docs
    const perUlb = [];
    const documentsToInsert = [];

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const input = ulbs[i];

      if (r.status === "fulfilled") {
        perUlb.push({ ...r.value, ok: true });
        documentsToInsert.push(...r.value.documents); // ✅ ONE VARIABLE ready for DB
      } else {
        perUlb.push({
          ulbId: input?.ulbId,
          ulbCode: input?.ulbCode,
          ok: false,
          error: r.reason?.message || String(r.reason),
        });
      }
    }

    // ✅ this is what you wanted: array of objects ready to store
    // documentsToInsert = [{_id, ulbId, yearId, lineItems, createdAt, updatedAt}, ...]

    return res.status(200).json({
      success: true,
      count: documentsToInsert.length,
      documentsToInsert,
      perUlb, // helpful debug/monitoring
    });
  } catch (error) {
    console.log("Error in getApScriptData:", error?.response?.data || error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
