const express = require("express");
const router = express.Router();
const verifyToken = require("../auth/services/verifyToken").verifyToken;
const { addKeyword, getAllKeyword } = require("./service");

router.get("/searchKeyword", getAllKeyword);

router.post("/searchKeyword", addKeyword);
module.exports = router;
