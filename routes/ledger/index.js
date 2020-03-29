const express = require('express');
const router = express.Router();
const passport = require('passport');
const ledgerService = require('./service');

// Route to download all the existing ledgers in the system
router.get('/getAllLegdersCsv', ledgerService.getAllLedgersCsv);

// Get income expenditure
router.post('/getIE', ledgerService.getIE);

// Get Balance Sheet
router.post('/getBS', ledgerService.getBS);

router.post('/getAllLegders', ledgerService.getAllLegders);

//@LedgerLog

// Add Log
router.post('/log/addLog', (req, res, next)=>{
    req.body.isUserExist = false;
    ledgerService.addLog(req, res);
});
router.post('/log/addLogByToken', passport.authenticate('jwt', {session: false}), (req, res, next)=>{
    req.body.email = req.user.email;
    req.body.mobile = req.user.mobile;
    req.body.isUserExist = true;
    ledgerService.addLog(req, res);
});

// Get all logs
router.post('/log/getAll', passport.authenticate('jwt', {session: false}), ledgerService.getAllLogs);
module.exports = router;