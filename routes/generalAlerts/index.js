const express = require('express');
const router = express.Router();
const { verifyToken } = require('../auth/services/verifyToken')
const Service = require('./service')

//router.get('/',Service.getAll);
router.post('/',verifyToken , Service.createValue);
router.get('/',verifyToken,Service.getValue );
module.exports = router
