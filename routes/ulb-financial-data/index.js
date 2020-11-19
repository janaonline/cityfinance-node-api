const express = require('express');
const router = express.Router();
const verifyToken = require('../auth/service').verifyToken;
const ufdService = require('./service');
const ufdDashboardService = require('./fc-grant-service');
router.get("/", verifyToken,ufdService.get);
router.post("/list", verifyToken,ufdService.get);

router.post("/all", verifyToken,ufdService.getAll);
router.get("/all", verifyToken,ufdService.getAll);
router.post("/history/:_id", verifyToken,ufdService.getHistories);
router.get("/history/:_id", verifyToken,ufdService.getHistories);
router.get("/details/:_id", verifyToken,ufdService.getDetails);

router.post("/",verifyToken,ufdService.create);
router.put("/:_id",verifyToken,ufdService.update);
router.put("/correctness/:_id", verifyToken, ufdService.correctness);
router.put("/completeness/:_id",verifyToken, ufdService.completeness);
router.get("/approved-records",verifyToken, ufdService.getApprovedFinancialData);
router.get("/source-files/:_id",verifyToken, ufdService.sourceFiles);
router.post("/action/:_id",verifyToken,ufdService.action);
router.get("/dashboard/",ufdDashboardService);

module.exports = router;