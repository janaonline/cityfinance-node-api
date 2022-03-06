const express = require("express");
const { verify } = require("jsonwebtoken");
const router = express.Router();
const { verifyToken } = require("../auth/services/verifyToken");
const { getAccounts, action, createUpdate, getCSVAudited, getCSVUnaudited,nmpcEligibility, dashboard, dataset } = require("./service");
const { userAuth } = require("../../middlewares/actionUserAuth");
const statusList = require('../../util/newStatusList')
// router.get('/get/:ulb', verifyToken, get);
router.get("/get", verifyToken, getAccounts);
router.get("/nmpcUntiedEligibility", verifyToken, nmpcEligibility);
router.get("/getCSV-Audited", getCSVAudited);
router.get("/getCSV-Unaudited", getCSVUnaudited);
router.get("/dashboard", dashboard);
router.post("/create", verifyToken, createUpdate);
router.post("/action", verifyToken, userAuth, action);
router.get("/datasets", dataset);

module.exports = router;
