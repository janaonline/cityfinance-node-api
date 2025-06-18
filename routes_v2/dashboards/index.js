const express = require('express');
const router = express.Router();

router.use('/home-page', require('./home-page'));
router.use('/national', require('./national-dashboard'));
router.use('/city', require('./city-page'));

module.exports = router;
