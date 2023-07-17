const express = require('express');
const router = express.Router();

const Service = require('./service')

router.get('/documents',Service.getDocuments);
router.get('/insights',Service.getInsights);
router.get('/heatMap',Service.getHeatmap);

module.exports = router
