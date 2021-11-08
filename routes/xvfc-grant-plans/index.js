const express = require("express");
const router = express.Router();
const { savePlans, getPlans, removePlans, action } = require("./service");
const verifyToken = require("../auth/services/verifyToken").verifyToken;

const { userAuth } = require("../../middlewares/actionUserAuth");

//validator
const { planCreateValidator } = require("./validator");

//middleware
const { draftChecker } = require("../../util/validator");

//create
router.post(
  "/plans",
  verifyToken,
  savePlans
);

//get
router.get("/plans/:designYear", verifyToken, getPlans);

//delete
router.delete("/plans", verifyToken, removePlans);

//action
router.post("/plans/action", verifyToken,userAuth, action);

module.exports = router;
