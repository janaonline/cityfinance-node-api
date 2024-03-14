const express = require("express");
const router = express.Router();
const { get, uploadTemplate } = require("./service");
const verifyToken = require("../auth/services/verifyToken").verifyToken;

const { userAuth } = require("../../middlewares/actionUserAuth");

// router.post(
//   "/ActionPlans",
//   verifyToken,
//   saveActionPlans
// );

router.get("/template",verifyToken, get);
router.post("/uploadTemplate",verifyToken, uploadTemplate);
// router.get("/ActionPlans/:design_year", verifyToken, getActionPlans);

module.exports = router;
