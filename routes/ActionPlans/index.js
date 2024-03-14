const express = require("express");
const router = express.Router();
const { saveActionPlans, getActionPlans, removeActionPlans, action,getExcel } = require("./service");
const verifyToken = require("../auth/services/verifyToken").verifyToken;

const { userAuth } = require("../../middlewares/actionUserAuth");

//validator
// const { planCreateValidator } = require("./validator");

//middleware
// const { draftChecker } = require("../../util/validator");

//create
router.post(
  "/ActionPlans",
  verifyToken,
  saveActionPlans
);

//get
router.get("/ActionPlans/:design_year", verifyToken, getActionPlans);

//delete
// router.delete("/ActionPlans", verifyToken, removeActionPlans);

//action
router.post("/ActionPlans/action", verifyToken,userAuth, action);
router.post("/ActionPlans/getExcel", getExcel);

module.exports = router;
