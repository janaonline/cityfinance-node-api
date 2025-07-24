const express = require('express');
const router = express.Router();
const homePage = require('./homePage');
const cacheMiddleware = require('../../../middlewares/cacheMiddleware');

router.get('/get-data', cacheMiddleware('dashboard'), homePage.getData);

module.exports = router;
