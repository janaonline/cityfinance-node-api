const express = require('express');
const router = express.Router();
const cacheMiddleware = require('../../../middlewares/cacheMiddleware');
const { cityDetails } = require('./city-details');

router.get('/city-details', cacheMiddleware('dashboard'), cityDetails);

module.exports = router;