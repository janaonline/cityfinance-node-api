const express = require("express");
const router = express.Router();
const { saveLogs, getLogs, allForms } = require("./service");
const verifyToken = require("../auth/services/verifyToken").verifyToken;

//create
router.post("/save-logs", verifyToken, saveLogs);

//get
router.get("/save-logs", verifyToken, getLogs);

//
router.post("/allFormsData/delete", allForms);

module.exports = router;
