const UlbRanking = require("./ulb-ranking");
const FinancialData = require("./financial-data");
const Usage = require("./usage");
const express = require('express');
const router = express.Router();
const dashboards = require('./dashboard');
router.post("/ulb-ranking", UlbRanking);
router.get("/ulb-ranking", UlbRanking);

router.get("/financial-data/overall", FinancialData.filter,FinancialData.overall);
router.get("/financial-data/statewise", FinancialData.filter,FinancialData.statewise);
router.get("/financial-data/ulbtypewise", FinancialData.filter,FinancialData.ulbtypewise);
router.get("/financial-data/stateandulbtypewise", FinancialData.filter,FinancialData.stateandulbtypewise);
router.get("/usage", FinancialData.filter,Usage);
router.use('/dashboard',dashboards);
module.exports = router;
