const express = require('express');
const router = express.Router();

const passport = require('passport');
const downloadLogService = require('../service/download_log_service');
const Constants = require('../_helper/constants');

// Add Log
router.post('/addLog', (req, res, next)=>{
	req.body.isUserExist = false;
	downloadLogService.addLog(req, res);
});


router.post('/addLogByToken', passport.authenticate('jwt', {session: false}), (req, res, next)=>{
	req.body.email = req.user.email;
	req.body.mobile = req.user.mobile;
	req.body.isUserExist = true;
	downloadLogService.addLog(req, res);
});

// Get all logs
router.post('/getAll', passport.authenticate('jwt', {session: false}), (req, res, next)=>{
	downloadLogService.getAll();
});



module.exports = router;