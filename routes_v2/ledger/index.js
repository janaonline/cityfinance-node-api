const express = require('express');
const router = express.Router();
const verifyToken = require('../../routes/auth/services/verifyToken').verifyToken;
const { transferUlbLedgersToLedgerLogs } = require('./cron');
const { getLedgerDump } = require('./ledger-dump');

router.post('/transfer-ulbLedgers', verifyToken, transferUlbLedgersToLedgerLogs);
router.get('/getLedgerDump', getLedgerDump);

module.exports = router;