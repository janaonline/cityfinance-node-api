const express = require('express');
const router = express.Router();
const { calculateFRScore } = require('./scoring-service');
const { calculateFRPercentage } = require('./scoring-percentage-service');
const { dashboard, participatedState, states, topRankedUlbs, ulb } = require('./ranking-service');
const { verifyToken } = require('../auth/services/verifyToken');

router.get('/calculate-score', calculateFRScore);
router.get('/calculate-percentage', calculateFRPercentage);
router.get('/dashboard', dashboard);
router.get('/participated-state', participatedState);
router.get('/states', states);
router.get('/top-ranked-ulbs', topRankedUlbs);
router.get('/ulb', ulb);

module.exports = router