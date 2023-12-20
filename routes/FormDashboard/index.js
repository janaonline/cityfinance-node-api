const express = require('express');
const router = express.Router();
const { dashboard, getPopulationData } = require('./service');
const { verifyToken } = require('./../auth/services/verifyToken')

router.get('/', verifyToken, dashboard);
router.get('/populationData', verifyToken,getPopulationData )

module.exports = router;