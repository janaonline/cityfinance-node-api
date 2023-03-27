const express = require('express');
const router = express.Router();
const { verifyToken } = require('../auth/services/verifyToken')

const Service = require('./service')


module.exports = router
