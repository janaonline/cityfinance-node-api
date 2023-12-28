const express = require('express');
const router = express.Router();
const Service = require('./service')

router.get('/',Service.getLink );
router.post('/' , Service.createLinkRecords);

module.exports = router
