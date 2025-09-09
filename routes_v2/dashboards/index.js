const express = require('express');
const router = express.Router();

router.use('/home-page', require('./home-page'));
router.use('/financial-info', require('./common-api'));
router.use('/national', require('./national-dashboard'));
router.use('/city', require('./city-page'));
router.use('/state', require('./state'));

module.exports = router;
