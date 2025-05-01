const express = require('express');
const router = express.Router();
const service = require('./service');

router.post('/postDemoData', service.postDemoData);
router.get('/getDemoForm', service.getDemoForm);
router.get('/getDemoDataDump', service.getDemoDump);

module.exports = router;
