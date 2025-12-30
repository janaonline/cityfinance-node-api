const express = require("express");
const router = express.Router();
const {
  marketReadinessDataByUlb,
  getAllStates,
  getAllUlbsMarketReadiness,
  getUlbSlugByName,
} = require("./marketReadiness");
const verifyToken =
  require("../../routes/auth/services/verifyToken").verifyToken;
const { transferUlbLedgersToLedgerLogs } = require("./cron");
const { getLedgerDump } = require("./ledger-dump");
const {
  getIndicators,
  createIndicators,
  getCityDasboardIndicators,
  getYearsDynamic,
  getFaqs,
  getCompareByIndicators,
  getIndicatorsNameCompareByPage,
  getUlbDetailsById,
  getaverageCompareByIndicators,
  downloadMarketDashboardExcel,
} = require("./indicators");

router.post(
  "/transfer-ulbLedgers",
  verifyToken,
  transferUlbLedgersToLedgerLogs
);
router.get("/get-indicatorTotals", getIndicators);
router.get("/getCityDasboardIndicators", getCityDasboardIndicators);
router.get("/getYearsDynamic", getYearsDynamic);
router.get("/getFaqs", getFaqs);
router.post("/create-indicators", createIndicators);
router.get("/getLedgerDump", getLedgerDump);
router.get("/getCompareByIndicators", getCompareByIndicators);
router.get("/getIndicatorsNameCompareByPage", getIndicatorsNameCompareByPage);
router.get("/getUlbDetailsById", getUlbDetailsById);
router.post("/getaverageCompareByIndicators", getaverageCompareByIndicators);
router.get("/downloadMarketDashboardExcel", downloadMarketDashboardExcel);

// Market Readiness Route
router.get("/market-readiness-data-by-ulb", marketReadinessDataByUlb);
router.get("/get-all-states", getAllStates);
router.get("/get-all-ulbs-market-readiness", getAllUlbsMarketReadiness);
router.get("/get-ulb-slug-by-name", getUlbSlugByName);
module.exports = router;
