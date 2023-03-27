const express = require("express");
const router = express.Router();
const {
  saveWaterRejenuvation,
  getWaterRejenuvation,
  removeWaterRejenuvation,
  action,
  updateIndicatorId
} = require("./service");
const verifyToken = require("../auth/services/verifyToken").verifyToken;

const { userAuth } = require("../../middlewares/actionUserAuth");

//validator
// const { planCreateValidator } = require("./validator");

//middleware
// const { draftChecker } = require("../../util/validator");
//update ids of water reje
router.get('/WaterRejenuvation/updateIndicatorId', updateIndicatorId);

//create
router.post("/WaterRejenuvation", verifyToken, saveWaterRejenuvation);

//get
router.get(
  "/WaterRejenuvation/:design_year",
  verifyToken,
  getWaterRejenuvation
);

//delete
// router.delete("/WaterRejenuvation", verifyToken, removeWaterRejenuvation);

//action
router.post("/WaterRejenuvation/action", verifyToken, userAuth, action);

module.exports = router;
