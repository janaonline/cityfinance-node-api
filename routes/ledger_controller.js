const express = require('express');
const router = express.Router();
const passport = require('passport');

const Constants = require('../_helper/constants');
const ledgerService = require('../service/ledger_service');
const ledgerUpload = require('../service/ledger_upload');
const reportService = require('../service/report_service');
const ulbUpload = require('../service/ulb-upload');

var multer = require('multer');


//Define where project photos will be stored
var storage = multer.diskStorage({
	destination: function (request, file, callback) {
	  callback(null, './uploads/');
	},
	filename: function (request, file, callback) {
	  console.log(file);
	  callback(null, file.originalname)
	}
  });
  
// Function to upload project images
var uploadMultiple = multer({
    storage: storage,
    limits: {
        files: 100, // allow only 1 file per request
        fileSize: 1024 * 1024 * 50, // 1 MB (max file size)
    },
	fileFilter: function (req, file, callback) { //file filter
	if (['xls', 'xlsx'].indexOf(file.originalname.split('.')[file.originalname.split('.').length - 1]) === -1) {
		return callback(new Error('Wrong extension type'));
	}
	callback(null, true);
    }
}).array('files', 100);

router.post('/bulkEntry', passport.authenticate('jwt', {session: false}), uploadMultiple, (req, res, next) => {
    console.log(req.user.role,Constants.USER.LEDGER_AUTHORITY)
    if(req.user.role === Constants.USER.LEDGER_AUTHORITY){
		ledgerUpload.bulkEntry(req, res);
	} else{
		res.json({success:false, msg:'Unauthorized user'});
	}

});

router.post('/bulk/ulb-upload', passport.authenticate('jwt', {session: false}), uploadMultiple, (req, res, next) => {
    console.log(req.user.role,Constants.USER.LEDGER_AUTHORITY)
    if(req.user.role === Constants.USER.LEDGER_AUTHORITY){
		ulbUpload.create(req, res);
	} else{
		res.json({success:false, msg:'Unauthorized user'});
	}

});

// New ULB ledger entry
router.post('/entry', passport.authenticate('jwt', {session: false}), (req, res, next) => {
    if(req.user.role === Constants.USER.LEDGER_AUTHORITY){
		ledgerService.entry(req, res);
	} else{
		res.json({success:false, msg:'Unauthorized user'});
	}
});

router.post('/getAggregate', (req, res, next) => {
    ledgerService.getAggregate(req, res);

});

router.post('/getAll', (req, res, next) => {
    ledgerService.getAll(req, res);

});

router.post('/getAllLegders', (req, res, next) => {
    ledgerService.getAllLegders(req, res);

});



// update entry
router.put('/entry/:entryId', (req, res, next) => {
    if (!req.params.entryId || req.user || req.user.role !== Constants.USER.LEDGER_AUTHORITY) {
        res.json({
            success: false,
            msg: 'Unauthorized User'
        });
    }
    ledgerService.update(req, res);

});

// update entry
router.post('/getIE', (req, res, next) => {
    ledgerService.getIE(req, res);

});


// update entry
router.post('/getBS', (req, res, next) => {
    ledgerService.getBS(req, res);

});


// get own revenue data
router.get('/own-revenue', (req, res) => {
    reportService.getOwnRevenueReport(req, res);

});

module.exports = router;