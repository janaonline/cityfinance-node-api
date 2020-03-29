const UlbRanking = require("./ulb-ranking")
const express = require('express');
const router = express.Router();
const dashboards = require('./dashboard');
router.post("/ulb-ranking", UlbRanking);
router.get("/ulb-ranking", UlbRanking);
router.use('/dashboard',dashboards);
module.exports = router;
