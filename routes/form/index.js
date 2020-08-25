const express = require('express');
const router = express.Router();
const formService = require('./service');
const verifyToken = require('../auth/service').verifyToken;

router.post('/dataCollectionForm',formService.post);
router.get('/dataCollectionForm',formService.get);

module.exports = router;