const express = require("express");
const router = express.Router();

const {
  createOrUpdate,
  read,
  update,
  remove,
  readById,
  action,
  report,
  read2223,
  dataRepair,
  GrantPositionDesiMalvalueUpdate,
  getProjects
} = require("./service");

const {changeGetApiForm,changePayloadFormat} = require("./middlewares")

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
  changePayloadFormat,
  reportCreateValidator,
  draftChecker,
  createOrUpdate
);
//read all
router.get("/utilization-report", verifyToken, read);
//read by id
router.get("/utilization-report/:financialYear/:designYear", verifyToken, readById);
router.get("/utilization-report/:financialYear/:designYear/:ulb_id", verifyToken, readById);
//update by id
router.put("/utilization-report/:financialYear", verifyToken, update);
//delete by id
router.delete("/utilization-report/:financialYear", verifyToken, remove);
//action
router.post("/utilization-report/action", verifyToken, userAuth, action);

//custom report 
router.get("/dur/report", report);
//2223
router.get("/utilReport", verifyToken, read2223,changeGetApiForm);

router.post("/repair_data",dataRepair);

router.get("/grantPositionDesiMalvalueUpdate",GrantPositionDesiMalvalueUpdate);
router.get("/getProjects",verifyToken,getProjects)
module.exports = router;
