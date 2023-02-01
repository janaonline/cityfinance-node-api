const express = require('express');
const router = express.Router();
const { verifyToken } = require('../auth/services/verifyToken')

const { get } = require('./service')
const { getAll, getAllForms } = require('./service')
const { finalSubmit, finalAction } = require('./service')
const {
  StateDashboard,
  plansData,
  slbWaterSanitationState,
  viewList,
  getHistory,
  stateUlbData,
  UAList,
  update,
  check,
  roleCorrection,
  statusCorrection,
  // statusCorrectionAnnual
} = require("./service");
router.get('/get/:design_year', verifyToken, get) //ulb login
router.get('/get/:design_year/:masterform_id', verifyToken, get) // admin login
router.get('/UAList', verifyToken, UAList) // admin login
router.get('/getAll/:design_year', verifyToken, getAll)//
router.get('/getAllForms', verifyToken, getAllForms)//
router.get('/state-dashboard/:design_year', verifyToken, StateDashboard)//
router.get('/dashboard-slbWS/state/:design_year', verifyToken, slbWaterSanitationState)
router.get('/dashboard-plansData/:design_year', verifyToken, plansData)
router.get('/dashboard-viewlist/:design_year', verifyToken, viewList)
router.get('/dashboard-viewlist/:design_year/:formName', verifyToken, viewList)
router.get('/stateUlb', verifyToken, stateUlbData)
router.get('/history/:formId', verifyToken, getHistory)
router.put('/:formId', verifyToken, update)
router.get('/check', verifyToken, check)

router.post('/finalSubmit', verifyToken, finalSubmit)
router.post('/finalAction', verifyToken, finalAction)

router.post('/roleCorrection', roleCorrection);
router.post('/statusCorrection', statusCorrection);
// router.post('/statusCorrectionAnnual', statusCorrectionAnnual);

module.exports = router;