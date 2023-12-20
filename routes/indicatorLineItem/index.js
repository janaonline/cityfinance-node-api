const express = require("express");
const router = express.Router();

const { get, createUpdate } = require("./service");
router.get("/", get); //state login
router.post("/", createUpdate);

module.exports = router;
