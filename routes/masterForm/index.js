const express = require('express');
const router = express.Router();
const { verifyToken } = require('../auth/services/verifyToken')

const { get } = require('./service')
const { getAll } = require('./service')

router.get('/get/:design_year', verifyToken, get)
router.get('/get/:design_year/:masterform_id', verifyToken, get)
router.get('/getAll/:design_year', verifyToken, getAll)

module.exports = router;