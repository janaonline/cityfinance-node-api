const express = require('express');
const router = express.Router();
const financialInfo = require('./financialInfo');
const cacheMiddleware = require('../../../middlewares/cacheMiddleware');

router.get('/get-data', cacheMiddleware('dashboard'),financialInfo.getData);

module.exports = router;
