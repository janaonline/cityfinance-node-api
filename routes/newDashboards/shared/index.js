const express = require("express");
const router = express.Router();
const { peopleInformation, moneyInformation } = require("./service");

router.get("/people-information", peopleInformation);
router.get("/money-information", moneyInformation);
module.exports = router;
