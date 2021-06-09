const express = require("express");
const router = express.Router();
const {
  getTemplate,
  uploadTemplate,
  getGrantDistribution,
} = require("./service");
const verifyToken = require("../auth/services/verifyToken").verifyToken;

//validator
// const { upload } = require("./validator");

//middleware
// const { draftChecker } = require("../../util/validator");

router.get(
  "/get/:design_year",
  verifyToken,
  getGrantDistribution
);

//get template
router.get("/template", verifyToken, getTemplate);

//upload
router.post("/upload", verifyToken, uploadTemplate);

module.exports = router;
