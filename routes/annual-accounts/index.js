const express = require("express");
const { verify } = require("jsonwebtoken");
const router = express.Router();
const { verifyToken } = require("../auth/services/verifyToken");
const { getAccounts, action, createUpdate, getCSV } = require("./service");
const { userAuth } = require("../../middlewares/actionUserAuth");

// router.get('/get/:ulb', verifyToken, get);
router.get("/get", verifyToken, getAccounts);
router.get("/getCSV", getCSV);
router.post("/create", verifyToken, createUpdate);
router.post("/action", verifyToken, userAuth, action);

module.exports = router;
