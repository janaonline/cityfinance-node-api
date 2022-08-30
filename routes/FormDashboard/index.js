const express = require('express');
const router = express.Router();
const {dashboard} = require('./service');
const { verifyToken} = require('./../auth/services/verifyToken')

router.get('/', verifyToken, dashboard);

module.exports = router;