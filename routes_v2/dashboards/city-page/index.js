const express = require('express');
const router = express.Router();
const { cityDetails } = require('./city-details');

router.get('/city-details', cityDetails);

module.exports = router;