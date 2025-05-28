const express = require("express");
const router = express.Router();
const cacheMiddleware = require('../../../middlewares/cacheMiddleware');

const {
  peopleInformation,
  moneyInformation,
  getLatestData,
  getYearList,
} = require("./service");

router.get("/people-information", peopleInformation);
router.get("/money-information", cacheMiddleware('dashboard'), moneyInformation);
router.get("/latest-year", getLatestData);
router.get("/latest-year/list", getYearList);
module.exports = router;
