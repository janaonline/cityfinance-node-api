const express = require('express');
const router = express.Router();
const { cityDetails } = require('./cityDetails');
const { bsIs } = require('./bsIs');
const { financialIndicators } = require('./financialIndicators');
const cacheMiddleware = require('../../../middlewares/cacheMiddleware');

router.get('/city-details', cityDetails);
router.get('/bs-is', bsIs);
router.post('/financial-indicators', financialIndicators);

module.exports = router;
