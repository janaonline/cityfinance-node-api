require("dotenv").config();
const express = require('express');
const router = express.Router();
const service = require('./service');
const { verifyToken } = require('../../routes/auth/services/verifyToken');
router.get('/getApScriptData', service.getApScriptData);
module.exports = router;