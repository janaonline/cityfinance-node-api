const express = require('express');
const router = express.Router();
const { verifyToken } = require('../auth/services/verifyToken')

const { get } = require('./service')

router.get('/get/:design_year', verifyToken, get)

module.exports = router;