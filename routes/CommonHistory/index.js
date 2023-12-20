const express = require('express');
const router = express.Router();
const { verifyToken } = require('../auth/services/verifyToken')
const { getHistory } = require('./service')


router.get('/', verifyToken, getHistory);
// router.get('/getHistory', verifyToken, getHistoryNew);

module.exports = router