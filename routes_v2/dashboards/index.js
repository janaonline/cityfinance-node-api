const express = require('express');
const router = express.Router();

router.use('/city', require('./city-page'));
router.use('/national', require('./national-dashboard'));

module.exports = router;