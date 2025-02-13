const express = require("express");
const router = express.Router();
const {
  getTemplate,
  uploadTemplate,
  getGrantDistribution,
  saveData,
  getGrantDistributionForm,
  installmentAction
} = require("./service");
const verifyToken = require("../auth/services/verifyToken").verifyToken;

//validator
// const { upload } = require("./validator");


//middleware
// const { draftChecker } = require("../../util/validator");

router.get("/get/:design_year", verifyToken, getGrantDistribution);

//get template
router.get("/template", verifyToken, getTemplate);
//upload
router.get("/upload", verifyToken, uploadTemplate);
//save
router.post("/save", verifyToken, saveData);

router.get("/getGrantDistributionForm",verifyToken,getGrantDistributionForm)
router.post("/installmentAction",verifyToken,installmentAction)
module.exports = router;
