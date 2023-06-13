const express = require('express');
const router = express.Router();
const { verifyToken } = require('../auth/services/verifyToken')
const {getHistory,getHistory2324} = require('./service')


router.get('/', verifyToken, getHistory);
router.get('/23-24', verifyToken, getHistory2324);

module.exports = router