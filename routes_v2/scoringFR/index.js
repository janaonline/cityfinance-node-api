const express = require('express');
const router = express.Router();
const { calculateFRScore } = require('./cron/scoring-service.js');
const { calculateFRPercentage } = require('./cron/scoring-percentage-service.js');
const { calculateFRRank } = require('./cron/scoring-rank-service.js');
const { calculateFRAverage } = require('./cron/scoring-average-service.js');
const stateService = require('./cron/scoring-state-data-service.js');
const ulbService = require('./ulb-service');
const rankingService = require('./ranking-service');
const { assessmentParametersDashboard } = require('./assessment-parameters');
const { topRankedUlbsDump } = require('./data-dump.js');
// const { setUlbScore } = require('./cron/set-ulb-score');
// const { verifyToken } = require('../auth/services/verifyToken');

//-------- Scoring API (To be executed in sequence) ------------
// 01. calculate ULB score
router.get('/calculate-score', calculateFRScore);
// 02. calculate ULB percentage
router.get('/calculate-percentage', calculateFRPercentage);
// 03. set participated for state and ulb
router.get('/set-ulb-participated', stateService.setUlbParticipatedData);
// 04. calculate assessment parameter rank
router.get('/calculate-rank', calculateFRRank);
// 05. calculate avg for ass param
router.get('/calculate-avg', calculateFRAverage);
// 06. set high and low score for each indicator (TODO: tobe removed)
// router.get('/set-ulb-score', setUlbScore);
// 07. set state data
router.get('/set-state-data', stateService.setStateData);

//-------- Ranking API ------------
router.get('/dashboard', rankingService.dashboard);
router.get('/participated-state', rankingService.participatedState);
router.get('/participated-state-map', rankingService.participatedStateMap);
router.get('/filters', rankingService.filterApi);
router.get('/states/:select?', rankingService.states);
router.get('/top-ranked-states', rankingService.topRankedStates);
router.get('/top-ranked-ulbs', rankingService.topRankedUlbs);
router.get('/ulb/:searchId?', ulbService.getUlbDetails);
router.get('/ulbs/:stateId?', ulbService.getUlbsBySate);
router.get('/search-ulbs', ulbService.getSearchedUlbDetailsGraph);
router.get('/autocomplete-ulbs', ulbService.autoSuggestUlbs);
router.get('/assessment-parameters', assessmentParametersDashboard);
// router.get('/audited-accounts', states);
// router.get('/annual-budget', states);

//-------- Data Dumps ------------
router.get('/top-ranked-ulbs-dump', topRankedUlbsDump);

module.exports = router;
