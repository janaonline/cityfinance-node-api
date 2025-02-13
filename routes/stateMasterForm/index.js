const express = require('express');
const router = express.Router();
const { verifyToken } = require('../auth/services/verifyToken')

const { get,waterRejCard } = require('./service')
const { getAll } = require('./service')
const { finalSubmit, finalAction } = require('./service')
const { getHistory, getAllForms, deleteForms } = require('./service')
router.get('/get/:design_year', verifyToken, get) //state login
router.get('/get/:design_year/:state_id', verifyToken, get) // admin login
router.get('/getAllForms/:design_year/:state_id', verifyToken, getAllForms) // admin login
router.get('/getAll/:design_year', verifyToken, getAll)//MoHUA /admin login
router.get('/history/:formId', verifyToken, getHistory)
router.post('/finalSubmit', verifyToken, finalSubmit)
router.post('/finalAction', verifyToken, finalAction)
router.post('/deleteAllForms', deleteForms)

router.get('/waterRej-action-card', verifyToken, waterRejCard) // admin login


module.exports = router;