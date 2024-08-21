const express = require("express");
const morgan = require("morgan");
const { logger } = require("../middlewares/loggermiddleware")
const { verifyToken } = require("./auth/services/verifyToken");

const router = express.Router();
// @Base Url
router.use((req, res, next) => {
  req["currentUrl"] = `${req.protocol + "://" + req.headers.host}`;
  next();
});

// @Morgan logger
router.use(logger.setResponseBody)
morgan.token('request', function (req, res) {
  try {
    logger.createLog(req, res)
  }
  catch (err) {
    console.log("token not created ::", err.message)
  }
})
router.use(morgan(":request"))


// //calculate fiscal ranking score
// const scoringFR = require('./scoringFR');
// router.use('/scoring-fr', scoringFR);

module.exports = router;