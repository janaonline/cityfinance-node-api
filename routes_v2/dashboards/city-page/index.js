const express = require('express');
const router = express.Router();
const { cityDetails } = require('./cityDetails');
const { bsIs } = require('./bsIs');
const { financialIndicators } = require('./financialIndicators');
const cacheMiddleware = require('../../../middlewares/cacheMiddleware');

router.get('/city-details', cacheMiddleware('dashboard'), cityDetails);
// router.get('/bs-is', cacheMiddleware('dashboard'), bsIs);
router.get('/bs-is', bsIs);
router.post('/financial-indicators', cacheMiddleware('dashboard'), financialIndicators);

module.exports = router;
