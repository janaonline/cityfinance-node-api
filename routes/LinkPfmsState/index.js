const express = require("express");
const router = express.Router();
const { saveLinkPfmsState, getLinkPfmsState, removeLinkPfmsState, action } = require("./service");
const verifyToken = require("../auth/services/verifyToken").verifyToken;

const { userAuth } = require("../../middlewares/actionUserAuth");

//validator
// const { planCreateValidator } = require("./validator");

//middleware
// const { draftChecker } = require("../../util/validator");

//create
router.post(
  "/LinkPfmsState",
  verifyToken,
  saveLinkPfmsState
);

//get
router.get("/LinkPfmsState", verifyToken, getLinkPfmsState);

//delete
// router.delete("/LinkPfmsState", verifyToken, removeLinkPfmsState);

//action
router.post("/LinkPfmsState/action", verifyToken,userAuth,action);

module.exports = router;
