const express = require('express');
const router = express.Router();
const { verifyToken } = require('../auth/services/verifyToken')

const { get } = require('./service')
const { create } = require('./service')


router.get('/get/:design_year', verifyToken, get)
router.post('/create', verifyToken, create)


module.exports = router;