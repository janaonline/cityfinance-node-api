const express = require('express');
const router = express.Router();
const { details } = require('./service');
// const { bsIs } = require('./bsIs');
// const { financialIndicators } = require('./financialIndicators');
const cacheMiddleware = require('../../../middlewares/cacheMiddleware');

router.get('/details', cacheMiddleware('dashboard'), details);

module.exports = router;
