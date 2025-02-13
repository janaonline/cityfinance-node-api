const express = require('express');
const router = express.Router();
const verifyToken = require('../auth/services/verifyToken').verifyToken;
const ufdService = require('./service');
router.get("/", verifyToken, ufdService.get);
router.post("/list", verifyToken, ufdService.get);

router.post("/all", verifyToken, ufdService.getAll);
router.get("/all", verifyToken, ufdService.getAll);
router.post("/history/:_id", verifyToken, ufdService.getHistories);
router.get("/history/:_id", verifyToken, ufdService.getHistories);
router.get("/details/:_id", verifyToken, ufdService.getDetails);

router.post("/", verifyToken, ufdService.create);
router.put("/:_id", verifyToken, ufdService.update);
router.put("/correctness/:_id", verifyToken, ufdService.correctness);
router.put("/completeness/:_id", verifyToken, ufdService.completeness);
router.get("/approved-records", verifyToken, ufdService.getApprovedFinancialData);
router.get("/source-files/:_id", verifyToken, ufdService.sourceFiles);
module.exports = router;