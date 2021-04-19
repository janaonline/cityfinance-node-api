const express = require("express");
const router = express.Router();

const {
  createOrUpdate,
  read,
  update,
  remove,
  readById,
  action,
} = require("./service");

const verifyToken = require("../auth/services/verifyToken").verifyToken;

//Middleware
const { draftChecker } = require("../../util/validator");
const { userAuth } = require("../../middlewares/actionUserAuth");

//validator
const { reportCreateValidator } = require("./validator");

//create
router.post(
  "/utilization-report",
  verifyToken,
  reportCreateValidator,
  draftChecker,
  createOrUpdate
);
//read all
router.get("/utilization-report", verifyToken, read);
//read by id
router.get("/utilization-report/:ulb/:financialYear", verifyToken, readById);
//update by id
router.put("/utilization-report/:ulb/:financialYear", verifyToken, update);
//delete by id
router.delete("/utilization-report/:ulb/:financialYear", verifyToken, remove);
//action
router.post("/utilization-report/action", verifyToken, userAuth, action);
module.exports = router;
