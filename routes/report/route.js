const express = require('express');
const router = express.Router();
const UlbRanking = require('./index');

router.post("/ulb-ranking", UlbRanking.UlbRanking);
router.get("/ulb-ranking", UlbRanking.UlbRanking);
module.exports = router;
