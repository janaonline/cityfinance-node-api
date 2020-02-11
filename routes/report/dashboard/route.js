const express = require('express');
const router = express.Router();
const dashboard = require('./index');
router.get("/cash-and-bank", dashboard.cashAndBank);
<<<<<<< HEAD
router.get("/outstanding-bank", dashboard.outstandingBank);
router.get("/own-revenue-dependency", dashboard.filterUlbs, dashboard.ownRevenueDependency);
=======
router.get("/outstanding-bank", dashboard.outstandingBank); // remove
router.get("/outstanding-debt", dashboard.filterUlbs, dashboard.outstandingDebt);
router.get("/own-revenue-dependency", dashboard.ownRevenueDependency);
>>>>>>> f75499fae1b516709c5f5a480ef6c5a6df009037
router.get("/revenue-expenditure", dashboard.revenueExpenditure);
router.get("/source-financial-revenue-expenditure", dashboard.sourceFinancialRevenueExpenditure);
router.get("/source-revenue", dashboard.filterUlbs, dashboard.sourceRevenue);
router.get("/ulb-coverage", dashboard.ulbCoverage);
module.exports = router;
