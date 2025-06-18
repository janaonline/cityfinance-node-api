const express = require('express');
const router = express.Router();
const { cityDetails } = require('./cityDetails');
const cacheMiddleware = require('../../../middlewares/cacheMiddleware');

router.get('/city-details', cityDetails);

module.exports = router;
