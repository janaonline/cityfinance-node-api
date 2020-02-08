const express = require('express');
const router = express.Router();
const UlbRanking = require('./index');
const dashboards = require('./dashboard/route');
router.post("/ulb-ranking", UlbRanking.UlbRanking);
router.get("/ulb-ranking", UlbRanking.UlbRanking);
router.use('/dashboard',dashboards);
module.exports = router;
