const dashboard = {
    revenueExpenditure: require('./avenues-revenue-expenditure'),
    cashAndBank: require('./cash-and-bank-balance'),
    outstandingBank: require('./outstanding-debt'),
    outstandingDebt: require('./outstanding-debt'),
    ownRevenueDependency: require('./own-revenue-dependency'),
    sourceFinancialRevenueExpenditure: require('./source-financial-revenue-expenditure'),
    sourceRevenue: require('./source-revenue'),
    ulbCoverage: require('./ulb-coverage'),
    filterUlbs: require('./filter-ulbs'),
    homePageData: require('./home-page')
}
const express = require('express');
const router = express.Router();
router.get("/cash-and-bank", dashboard.filterUlbs, dashboard.cashAndBank);
router.get("/outstanding-debt", dashboard.filterUlbs, dashboard.outstandingDebt);
router.get("/own-revenue-dependency", dashboard.filterUlbs, dashboard.ownRevenueDependency);
router.get("/revenue-expenditure", dashboard.filterUlbs, dashboard.revenueExpenditure);
router.get("/source-financial-revenue-expenditure", dashboard.filterUlbs, dashboard.sourceFinancialRevenueExpenditure);
router.get("/source-revenue", dashboard.filterUlbs, dashboard.sourceRevenue);
router.get("/ulb-coverage", dashboard.ulbCoverage);
router.get("/home-page-data",dashboard.homePageData);
module.exports = router;
