const express = require('express');
const router = express.Router();
const { verifyToken } = require('../auth/services/verifyToken')
const Service = require('./service')

router.get('/all',verifyToken,Service.getAll);
router.post('/',verifyToken , Service.createUpdateValue);
router.get('/', Service.getValue );
module.exports = router
