const express = require('express');
const router = express.Router();
const service = require('./service');

router.post('/auth', service.authDalgo);

module.exports = router;