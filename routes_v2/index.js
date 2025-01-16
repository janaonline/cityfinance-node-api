const express = require('express');
const morgan = require('morgan');
const { logger } = require('../middlewares/loggermiddleware');
// const { verifyToken } = require('../routes/auth/services/verifyToken');

const router = express.Router();
// @Base Url
router.use((req, res, next) => {
  req['currentUrl'] = `${req.protocol + '://' + req.headers.host}`;
  next();
});

// @Morgan logger
router.use(logger.setResponseBody);
morgan.token('request', function (req, res) {
  try {
    logger.createLog(req, res);
  } catch (err) {
    console.log('token not created ::', err.message);
  }
});
router.use(morgan(':request'));

// Calculate fiscal ranking score
router.use('/scoring-fr', require('./scoringFR'));

// Dalgo
router.use('/dalgo', require('./dalgo'));

// Download logs - User Info.
router.use('/file-download-log', require('./file-download-log'));

// National Dashboard.
router.use('/national-performance-dashboard', require('./dashboards/national-dashboard'));

module.exports = router;