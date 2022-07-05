const express = require('express');
const router = express.Router();
const { verifyToken } = require('../auth/services/verifyToken')

const { get } = require('./GT-Certificate/service')
const { create, action, showGTCform, report } = require('./GT-Certificate/service')

router.get('/state/gtc/get/:design_year', verifyToken, get)
router.get('/state/condition', verifyToken, showGTCform)
router.post('/state/gtc/create', verifyToken, create)
router.post('/state/gtc/action', verifyToken, action)
router.get('/state/gtc/report', report)

module.exports = router;