const express = require('express');
const router = express.Router();
const {verifyToken} = require('../auth/services/verifyToken');
const service = require("./service");

router.post("/create-entry-tabs",verifyToken,service.createTabs)
module.exports = router;