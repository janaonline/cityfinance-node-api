const express = require('express');
const router = express.Router();
const { calculateFRScore } = require('./scoring-service');
const { calculateFRPercentage } = require('./scoring-percentage-service');
const { calculateFRRank } = require('./scoring-rank-service');
const { calculateFRAverage } = require('./scoring-average-service');
const { setUlbScore } = require('./set-ulb-score');
const { setStateData } = require('./scoring-state-data-service');
const { getUlbDetails, getSearchedUlbDetailsGraph, getUlbsBySate, autoSuggestUlbs } = require('./ulb-service');
const { dashboard, participatedState, filterApi, states, topRankedUlbs, topRankedStates } = require('./ranking-service');
const { assessmentParametersDashboard } = require('./assessment-parameters');
const { verifyToken } = require('../auth/services/verifyToken');

router.get('/calculate-score', calculateFRScore);
router.get('/set-ulb-score', setUlbScore);
router.get('/calculate-percentage', calculateFRPercentage);
router.get('/calculate-rank', calculateFRRank);
router.get('/calculate-avg', calculateFRAverage);
router.get('/set-state-data', setStateData);
router.get('/dashboard', dashboard);
router.get('/participated-state', participatedState);
router.get('/filters', filterApi);
router.get('/states/:select?', states);
// router.get('/audited-accounts', states);
// router.get('/annual-budget', states);
router.get('/top-ranked-states', topRankedStates);
router.get('/top-ranked-ulbs', topRankedUlbs);
router.get('/ulb/:searchId?', getUlbDetails);
router.get('/ulbs/:stateId?', getUlbsBySate);
router.get('/search-ulbs', getSearchedUlbDetailsGraph);
router.get('/autocomplete-ulbs', autoSuggestUlbs);
router.get('/assessment-parameters', assessmentParametersDashboard);

module.exports = router