const express = require('express');
const router = express.Router();
const {createOrUpdateForm, getForm, defunct} = require('./service')
const { verifyToken } = require('../auth/services/verifyToken')

router.get('/', verifyToken, getForm);
router.post('/', verifyToken, createOrUpdateForm);
router.get('/defunctGFCODF', defunct);
module.exports = router;