const express = require('express');
const router = express.Router();
const { verifyToken } = require('../auth/services/verifyToken')

const { get } = require('./GT-Certificate/service')
const { create } = require('./GT-Certificate/service')

router.get('/state/gtc/get/:design_year', verifyToken, get)
router.post('/state/gtc/create', verifyToken, create)

module.exports = router;