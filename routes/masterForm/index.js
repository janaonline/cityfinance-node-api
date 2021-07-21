const express = require('express');
const router = express.Router();
const { verifyToken } = require('../auth/services/verifyToken')

const { get } = require('./service')
const { getAll, getAllForms } = require('./service')
const { finalSubmit, finalAction } = require('./service')
const { StateDashboard, plansData, plansDataState, viewList, getHistory, stateUlbData, UAList } = require('./service')
router.get('/get/:design_year', verifyToken, get) //ulb login
router.get('/get/:design_year/:masterform_id', verifyToken, get) // admin login
router.get('/UAList', verifyToken, UAList) // admin login
router.get('/getAll/:design_year', verifyToken, getAll)//
router.get('/getAllForms', verifyToken, getAllForms)//
router.get('/state-dashboard/:design_year', verifyToken, StateDashboard)//
router.get('/dashboard-plansData/state/:design_year', verifyToken, plansDataState)
router.get('/dashboard-plansData/:design_year', verifyToken, plansData)
router.get('/dashboard-viewlist/:design_year', verifyToken, viewList)
router.get('/dashboard-viewlist/:design_year/:formName', verifyToken, viewList)
router.get('/stateUlb', verifyToken, stateUlbData)
router.get('/history/:formId', verifyToken, getHistory)

router.post('/finalSubmit', verifyToken, finalSubmit)
router.post('/finalAction', verifyToken, finalAction)

module.exports = router;