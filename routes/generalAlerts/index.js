const express = require('express');
const router = express.Router();
const { verifyToken } = require('../auth/services/verifyToken')
const Service = require('./service')

router.post('/',verifyToken , Service.createValue);
router.get('/', Service.getValue );
module.exports = router
