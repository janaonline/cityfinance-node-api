const express = require("express");
const { verify } = require("jsonwebtoken");
const router = express.Router();
const { verifyToken } = require("../auth/services/verifyToken");
const { getAccounts,action,createUpdate } = require("./service");

// router.get('/get/:ulb', verifyToken, get);
router.get("/get", verifyToken, getAccounts);
router.post("/create", verifyToken, createUpdate);
router.post("/action", verifyToken, action);

module.exports = router;
