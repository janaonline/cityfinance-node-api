const express = require("express");
const router = express.Router();
const { get, post } = require("./service");
const verifyToken = require("../auth/services/verifyToken").verifyToken;

router.get("/", get);
router.post("/", post);
module.exports = router;
