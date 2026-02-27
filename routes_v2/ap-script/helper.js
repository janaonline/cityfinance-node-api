const axios = require("axios");
require("dotenv").config();

function buildPayload({ ulbCode, majorCodes, startDate, endDate, prevStartDate, prevEndDate }) {
  return {
    ulbCode: String(ulbCode),
    majorCodes,
    startDate,
    endDate,
    prevStartDate,
    prevEndDate,
  };
}

/**
 * Calls external incomeExpenditure API and returns the JSON response.
 */
async function fetchIncomeExpenditure(payload) {
  const referer = process.env.REFERER_VALUE;
  const url = process.env.INCOME_EXP_URL;

  if (!url) throw new Error("Missing env: INCOME_EXP_URL");
  if (!referer) throw new Error("Missing env: INCOME_EXP_REFERER (Referer header value)");
  const resp = await axios.post(url, payload, {
    headers: {
      Referer: referer, // NOTE: exact case usually doesn't matter, but keep "Referer"
      "Content-Type": "application/json",
    },
    timeout: 60_000,
  });

  return resp.data; // <-- this is your big JSON (status, count, reports)
}

function buildDocumentsFromReports({ ulbId, yearIdPrev, yearIdCurr, reports }) {
  const now = new Date();

  const documents = [
    {
      // _id: new mongoose.Types.ObjectId(),
      ulbId,
      yearId: yearIdPrev,
      lineItems: {},
      createdAt: now,
      updatedAt: now,
    },
    {
      // _id: new mongoose.Types.ObjectId(),
      ulbId,
      yearId: yearIdCurr,
      lineItems: {},
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const item of reports || []) {
    const key = item.glCode || item.majorCode;
    if (!key) continue;

    // store 0 when null/undefined
    documents[0].lineItems[key] = item.prevYearBalance ?? 0;
    documents[1].lineItems[key] = item.currYearBalance ?? 0;
  }

  return documents;
}
/**
 * Runs async tasks with concurrency limit.
 * @param {number} limit
 * @param {Array} items
 * @param {(item:any)=>Promise<any>} iteratorFn
 */
async function asyncPool(limit, items, iteratorFn) {
  const ret = [];
  const executing = [];

  for (const item of items) {
    const p = Promise.resolve().then(() => iteratorFn(item));
    ret.push(p);

    const e = p.finally(() => {
      const idx = executing.indexOf(e);
      if (idx >= 0) executing.splice(idx, 1);
    });

    executing.push(e);
    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }

  return Promise.allSettled(ret);
}


module.exports = {
  buildPayload,
  fetchIncomeExpenditure,
  buildDocumentsFromReports,
  asyncPool,
};