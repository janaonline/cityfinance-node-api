const express = require('express');
const router = express.Router();
const {test} = require('./service');

router.get('/',test)

module.exports = router