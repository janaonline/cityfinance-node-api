const express = require('express');
const router = express.Router();
const verifyToken = require('../../routes/auth/services/verifyToken').verifyToken;
const { transferUlbLedgersToLedgerLogs } = require('./cron');
const { getLedgerDump } = require('./ledger-dump');
const { getIndicators,createIndicators,getCityDasboardIndicators,getYearsDynamic,getFaqs,getCompareByIndicators } = require('./indicators');

router.post('/transfer-ulbLedgers', verifyToken, transferUlbLedgersToLedgerLogs);
router.get('/get-indicatorTotals', getIndicators);
router.get('/getCityDasboardIndicators', getCityDasboardIndicators);
router.get('/getYearsDynamic', getYearsDynamic);
router.get('/getFaqs', getFaqs);
router.post('/create-indicators', createIndicators);
router.get('/getLedgerDump', getLedgerDump);
router.get('/getCompareByIndicators', getCompareByIndicators);

module.exports = router;
