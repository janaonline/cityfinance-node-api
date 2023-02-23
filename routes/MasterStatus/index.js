const express = require('express');
const router = express.Router();
const { verifyToken } = require('../auth/services/verifyToken')

const Service = require('./service')


router.get('/',Service.getValue );
router.get('/all',Service.getAll);
router.post('/', verifyToken , Service.createValue);

module.exports = router
