const express = require('express');
const router = express.Router();
const { calculateFRScore } = require('./scoring-service');
const { calculateFRPercentage } = require('./scoring-percentage-service');
const { calculateFRRank } = require('./scoring-rank-service');
const { setStateData } = require('./scoring-state-data-service');
const { getUlbDetails, getSearchedUlbDetails } = require('./ulb-service');
const { dashboard, participatedState, states, topRankedUlbs } = require('./ranking-service');
const { verifyToken } = require('../auth/services/verifyToken');

router.get('/calculate-score', calculateFRScore);
router.get('/set-ulb-score', setUlbScore);
router.get('/calculate-percentage', calculateFRPercentage);
router.get('/calculate-rank', calculateFRRank);
router.get('/set-state-data', setStateData);
router.get('/dashboard', dashboard);
router.get('/participated-state', participatedState);
router.get('/states', states);
router.get('/top-ranked-ulbs', topRankedUlbs);
router.get('/ulb/:censusCode?', getUlbDetails);
router.get('/search-ulbs', getSearchedUlbDetails);

module.exports = router