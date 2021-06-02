const express = require("express");
const router = express.Router();
const { saveWaterRejenuvation, getWaterRejenuvation, removeWaterRejenuvation, action } = require("./service");
const verifyToken = require("../auth/services/verifyToken").verifyToken;

const { userAuth } = require("../../middlewares/actionUserAuth");

//validator
// const { planCreateValidator } = require("./validator");

//middleware
// const { draftChecker } = require("../../util/validator");

//create
router.post(
  "/WaterRejenuvation",
  verifyToken,
  saveWaterRejenuvation
);

//get
router.get("/WaterRejenuvation/:design_year", verifyToken, getWaterRejenuvation);

//delete
// router.delete("/WaterRejenuvation", verifyToken, removeWaterRejenuvation);

//action
// router.post("/WaterRejenuvation/action", verifyToken, action);

module.exports = router;
