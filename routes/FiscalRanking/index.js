const express = require("express");
const router = express.Router();
const { verifyToken } = require('../auth/services/verifyToken')
const { CreateorUpdate } = require('./service')

router.post(
  "/create",
  verifyToken,
  CreateorUpdate
);
module.exports = router;
