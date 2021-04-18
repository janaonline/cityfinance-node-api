const express = require("express");
const router = express.Router();
const { savePlans, getPlans, removePlans, action } = require("./service");
const verifyToken = require("../auth/service").verifyToken;

//validator
const { planCreateValidator } = require("./validator");

//middleware
const { draftChecker } = require("../../util/validator");

//create
router.post(
  "/plans",
  verifyToken,
  planCreateValidator,
  draftChecker,
  savePlans
);

//get
router.get("/plans/:ulb/:designYear", verifyToken, getPlans);

//delete
router.delete("/plans", verifyToken, removePlans);

//action
router.post("/plans/action", verifyToken, action);

module.exports = router;
