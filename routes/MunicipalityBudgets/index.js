const express = require('express');
const router = express.Router();

const Service = require('./service')

router.get('/documents',Service.getDocuments);
router.get('/insights',Service.getInsights);

module.exports = router
