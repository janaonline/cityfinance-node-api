const express = require('express');
const router = express.Router();
const {calculateRecommendation} = require('./service');

router.post('/', calculateRecommendation);

module.exports = router