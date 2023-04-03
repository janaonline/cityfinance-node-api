const express = require("express");
const { verify } = require("jsonwebtoken");
const router = express.Router();
const { verifyToken } = require("../auth/services/verifyToken");
const {changePayload,changeResponse} = require("./middlewares")
const { getAccounts, action, createUpdate, getCSVAudited, getCSVUnaudited,nmpcEligibility, dashboard, dataset, datasetDownload, fileDeFuncFiles, updateAnnualAccForms } = require("./service");
const { userAuth } = require("../../middlewares/actionUserAuth");
// const {emailTrigger} =  require('../../cronjob/stateEmail')
const statusList = require('../../util/newStatusList')
// router.get('/get/:ulb', verifyToken, get);
router.get("/get", verifyToken, getAccounts,changeResponse);
router.get("/nmpcUntiedEligibility", verifyToken, nmpcEligibility);
router.get("/getCSV-Audited", getCSVAudited);
router.get("/getCSV-Unaudited", getCSVUnaudited);
router.get("/dashboard", dashboard);
router.post("/create", verifyToken,changePayload ,createUpdate);
router.post("/action", verifyToken, userAuth, action);
router.get("/datasets", dataset);
router.post("/datasets", datasetDownload);


router.get("/findNonFunctionalLinks", fileDeFuncFiles);

router.get('/addKeys', updateAnnualAccForms );
// router.get('/stateEmail', emailTrigger)
module.exports = router;
