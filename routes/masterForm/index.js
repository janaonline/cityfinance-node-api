const express = require('express');
const router = express.Router();
const { verifyToken } = require('../auth/services/verifyToken')

const { get } = require('./service')
const { getAll, getAllForms } = require('./service')
const { finalSubmit } = require('./service')
const { StateDashboard, plansData } = require('./service')
router.get('/get/:design_year', verifyToken, get) //ulb login
router.get('/get/:design_year/:masterform_id', verifyToken, get) // admin login
router.get('/getAll/:design_year', verifyToken, getAll)//
router.get('/getAllForms', verifyToken, getAllForms)//
router.get('/state-dashboard/:design_year', verifyToken, StateDashboard)//
router.get('/dashboard-plansData/:design_year', verifyToken, plansData)
router.post('/finalSubmit', verifyToken, finalSubmit)

module.exports = router;