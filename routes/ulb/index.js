const passport = require('passport');
const express = require('express');
const router = express.Router();
const Ulb = require('./service')
const verifyToken = require('../auth/service').verifyToken;

router.get('/ulb/filtered', Ulb.getFilteredUlb);  // ulb have no questionnaire

router.get('/ulb', Ulb.get);
router.get('/getAllULBS/csv', Ulb.getAllULBSCSV);
router.put('/ulb/:_id', verifyToken,Ulb.put);
router.post('/Ulb', verifyToken, Ulb.post);
router.delete('/Ulb/:_id',verifyToken,Ulb.delete);
router.get('/ulblist', Ulb.getPopulate);
router.post('/ulb-list', Ulb.getUlbsWithAuditStatus);
// Get ULBs by state
router.get('/states/:stateCode/ulbs', Ulb.getByState);
// Get All Ulbs
router.get('/ulbs', Ulb.getAllUlbs);

// Get OverallUlb
router.get("/overall-ulb",Ulb.getOverallUlb);
router.get('/ulb-by-code', Ulb.getUlbByCode);
module.exports = router;