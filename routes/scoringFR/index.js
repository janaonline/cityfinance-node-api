const express = require('express');
const router = express.Router();
const { calculateFRScore } = require('./scoring-service');
const { calculateFRPercentage } = require('./scoring-percentage-service');
const { calculateFRRank } = require('./scoring-rank-service');
const { calculateFRAverage } = require('./scoring-average-service');
const { setStateData, setUlbParticipatedData } = require('./scoring-state-data-service');
const { getUlbDetails, getSearchedUlbDetailsGraph, getUlbsBySate, autoSuggestUlbs } = require('./ulb-service');
const { dashboard, participatedState, participatedStateMap, filterApi, states, topRankedUlbs, topRankedStates } = require('./ranking-service');
const { assessmentParametersDashboard } = require('./assessment-parameters');
const { topRankedUlbsDump } = require('./data-dump.js');
// const { setUlbScore } = require('./set-ulb-score');
// const { verifyToken } = require('../auth/services/verifyToken');

//-------- Scoring API (To be executed in sequence) ------------
// 01. calculate ULB score
router.get('/calculate-score', calculateFRScore);
// 02. calculate ULB percentage
router.get('/calculate-percentage', calculateFRPercentage);
// 03. set participated for state and ulb
router.get('/set-ulb-participated', setUlbParticipatedData);
// 04. calculate assessment parameter rank
router.get('/calculate-rank', calculateFRRank);
// 05. calculate avg for ass param
router.get('/calculate-avg', calculateFRAverage);
// 06. set high and low score for each indicator (TODO: tobe removed)
// router.get('/set-ulb-score', setUlbScore);
// 07. set state data
router.get('/set-state-data', setStateData);

//-------- Ranking API ------------
router.get('/dashboard', dashboard);
router.get('/participated-state', participatedState);
router.get('/participated-state-map', participatedStateMap);
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

//-------- Data Dumps ------------
router.get('/top-ranked-ulbs-dump', topRankedUlbsDump);

module.exports = router;
