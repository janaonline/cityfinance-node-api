const express = require('express');
const router = express.Router();
const {calculateRecommendation} = require('./service');
const {verifyToken} = require('../auth/services/verifyToken');

router.post('/', verifyToken,calculateRecommendation);

module.exports = router