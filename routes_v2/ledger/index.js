const express = require('express');
const router = express.Router();
const verifyToken = require('../../routes/auth/services/verifyToken').verifyToken;
const { transferUlbLedgersToLedgerLogs } = require('./cron');

router.post('/transfer-ulbLedgers', verifyToken, transferUlbLedgersToLedgerLogs);

module.exports = router;