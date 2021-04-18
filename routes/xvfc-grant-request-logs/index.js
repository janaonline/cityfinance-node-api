const express = require("express");
const router = express.Router();
const { saveLogs, getLogs } = require("./service");
const verifyToken = require("../auth/service").verifyToken;

//create
router.post("/save-logs", verifyToken, saveLogs);

//get
router.get("/save-logs", verifyToken, getLogs);

module.exports = router;
