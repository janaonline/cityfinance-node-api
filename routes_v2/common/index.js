const express = require('express');
const router = express.Router();
const { getLatestAfsYear } = require('./common.js')

// Get the latest AFS year. @params
router.get('/get-latest-aa-year', getLatestAfsYear);

module.exports = router;
