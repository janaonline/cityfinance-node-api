const express = require('express');
const router = express.Router();

const Service = require('./service')

router.get('/documents',Service.getDocuments);

module.exports = router
