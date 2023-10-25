const express = require('express');
const router = express.Router();
const { calculateFRScore } = require('./service');
const { verifyToken } = require('../auth/services/verifyToken');

router.get('/calculate-score', calculateFRScore);

module.exports = router