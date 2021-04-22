const express = require("express");
const router = express.Router();
const { getTemplate, uploadTemplate } = require("./service");
const verifyToken = require("../auth/services/verifyToken").verifyToken;

//validator
// const { upload } = require("./validator");

//middleware
// const { draftChecker } = require("../../util/validator");

//get template
router.get("/template", verifyToken, getTemplate);

//upload
router.post("/upload", verifyToken, uploadTemplate);

module.exports = router;
