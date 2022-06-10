const express = require('express');
const router = express.Router();
const passport = require('passport');
const ledgerService = require('./service');
const verifyToken = require('../auth/services/verifyToken').verifyToken;
const ufdService = require('../ulb-financial-data/service');
// Route to download all the existing ledgers in the system
router.get('/getAllLegdersCsv', ledgerService.getAllLedgersCsv);
router.get('/lastUpdated', ledgerService.lastUpdated);

// Get income expenditure
router.post('/getIE', ledgerService.getIE);

// Get Balance Sheet
router.post('/getBS', ledgerService.getBS);

router.post('/getAllLegders', ledgerService.getAllLegders);

router.get('/getOverAllUlbLegders', ledgerService.getAllUlbLegders);
router.get('/report', ledgerService.report);
router.get('/requestLog', ledgerService.getRequestLog);


//@LedgerLog

// Add Log
router.post('/log/addLog', verifyToken, (req, res, next) => {
    req.body.isUserExist = false;
    ledgerService.addLog(req, res);
});
router.post('/log/addLogByToken', verifyToken, (req, res, next) => {
    req.body.email = req.user.email;
    req.body.mobile = req.user.mobile;
    req.body.isUserExist = true;
    ledgerService.addLog(req, res);
});

// Get all logs
router.post('/log/getAll', ledgerService.getAllLogs);

// Download Documents
router.get('/ulb-financial-data/files/:_id',ufdService.sourceFiles);
module.exports = router;