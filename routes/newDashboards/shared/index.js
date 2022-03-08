const express = require("express");
const router = express.Router();
const {
  peopleInformation,
  moneyInformation,
  getLatestData,
} = require("./service");

router.get("/people-information", peopleInformation);
router.get("/money-information", moneyInformation);
router.get("/latest-year", getLatestData);
module.exports = router;
