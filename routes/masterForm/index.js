const express = require('express');
const router = express.Router();
const { verifyToken } = require('../auth/services/verifyToken')

const { get } = require('./service')
const { getAll,getAllForms } = require('./service')

router.get('/get/:design_year', verifyToken, get) //ulb login
router.get('/get/:design_year/:masterform_id', verifyToken, get) // admin login
router.get('/getAll/:design_year', verifyToken, getAll)//

router.get('/getAllForms', verifyToken, getAllForms)//

module.exports = router;