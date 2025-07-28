const express = require('express');
const router = express.Router();
const service = require('./service');
const { verifyToken } = require('../../routes/auth/services/verifyToken')

router.get('/getYearsData', service.getYearsData);
router.post('/updatePdfs', service.updatePdfs);
// Migrate data from FiscalRanking to budget collection.
router.get('/convertJson', verifyToken, service.convertJson);
router.get('/getValidations', service.getValidations);
router.post('/uploadDataBulkPdf', service.uploadDataPDF);
router.get('/getUlbList', service.getUlbList);
router.get('/getYearEmptyData', service.getYearEmptyData);
router.get('/downloadDump', service.downloadDump);
module.exports = router;