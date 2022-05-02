const express = require("express");
const router = express.Router();
const { get, post, search } = require("./service");
const verifyToken = require("../auth/services/verifyToken").verifyToken;

router.get("/", get);
router.post("/", post);
router.get("/search", search);
module.exports = router;
