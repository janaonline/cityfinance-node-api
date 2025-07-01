const express = require('express');
const router = express.Router();
const service = require('./service');
const { verifyToken } = require('../../routes/auth/services/verifyToken')

router.get('/getYearsData', service.getYearsData);
router.post('/updatePdfs', service.updatePdfs);
router.get('/convertJson', service.convertJson);
router.get('/getValidations', service.getValidations);
router.get('/downloadDump', service.downloadDump);
module.exports = router;