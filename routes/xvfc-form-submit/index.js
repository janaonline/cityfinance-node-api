const express = require("express");
const router = express.Router();
const { formAction, formSubmit } = require("./service");
const verifyToken = require("../auth/services/verifyToken").verifyToken;

//middleware
const { userAuth } = require("../../middlewares/actionUserAuth");

//create
router.post("/form-submit-action", verifyToken, userAuth, formAction);
router.post("/form-submit", verifyToken, formSubmit);

module.exports = router;
