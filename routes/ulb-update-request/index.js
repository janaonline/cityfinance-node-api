const express = require('express');
const router = express.Router();
const verifyToken = require('../auth/service').verifyToken;
const uurService = require('./service');
router.get("/", verifyToken, uurService.get);
router.get("/:_id", verifyToken, uurService.getById);
router.post("/", verifyToken, uurService.create);
router.put("/action/:_id",verifyToken, uurService.action);
module.exports = router;