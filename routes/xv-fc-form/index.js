const express = require('express');
const router = express.Router();
const verifyToken = require('../auth/services/verifyToken').verifyToken;
const ufdService = require('./service');
const ufdDashboardService = require('./fc-grant-service');
const multer = require('multer');
const moment = require('moment');
const date = moment().format('DD-MMM-YY');
const storage1 = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/source_' + date);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname.replace(/ /g, '_'));
    },
});
const multerUpload = multer({ storage: storage1 });
router.get('/', verifyToken, ufdService.get);
router.get('/slb-report-download', ufdService.slbDownload);
router.get('/state/:design_year', ufdService.getSLBDataUAWise);
router.get('/admin/:ulb', verifyToken, ufdService.get);
router.post('/list', verifyToken, ufdService.get);
router.post('/all', verifyToken, ufdService.getAll);
router.get('/all/:design_year', verifyToken, ufdService.getAll);
router.post('/history/:_id', verifyToken, ufdService.getHistories);
router.get('/history/:_id', verifyToken, ufdService.getHistories);
router.get('/details/:_id', verifyToken, ufdService.getDetails);
router.post('/', verifyToken, ufdService.create);
router.post('/addFlag', verifyToken, ufdService.addFlag);
router.put('/:_id', verifyToken, ufdService.update);
router.post('/action/:_id', verifyToken, ufdService.action);
router.post('/newAction', verifyToken, ufdService.newFormAction);

router.get(
    '/approved-records',
    verifyToken,
    ufdService.getApprovedFinancialData
);
router.get('/fc-grant/dashboard-card/', verifyToken, ufdDashboardService);
router.get(
    '/fc-grant/dashboard-chart',
    verifyToken,
    ufdDashboardService.chartDataStatus
);
router.get('/fc-grant/ulbList', verifyToken, ufdDashboardService.ulbList);
router.post('/fc-grant/stateForm', verifyToken, ufdService.XVFCStateForm);
router.get('/fc-grant/stateForm', verifyToken, ufdService.getXVFCStateForm);
router.get(
    '/fc-grant/stateForm/:state',
    verifyToken,
    ufdService.getXVFCStateFormById
);

router.get('/reportUA',ufdService.getUAwiseCSV )
router.post(
    '/multiple-approve-action/:_id',
    verifyToken,
    ufdService.multipleApprove
);
router.post(
    '/multiple-reject-action/:_id',
    verifyToken,
    ufdService.multipleReject
);
router.get('/state', verifyToken, ufdService.state);
router.post(
    '/upload-financial-source',
    verifyToken,
    ufdService.createDir,
    multerUpload.single('file'),
    ufdService.unzip
);

module.exports = router;
