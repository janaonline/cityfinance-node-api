const express = require('express');
const router = express.Router();
const { getAFSFilterData } = require('../afs-digitization/afsFilters');
const { getAFSMetrics } = require("../afs-digitization/afsMetrics");

//Afs-filters
router.get('/afs-filters', getAFSFilterData); 

//Afs-metrics
router.get('/afs-metrics', getAFSMetrics);

module.exports = router;
