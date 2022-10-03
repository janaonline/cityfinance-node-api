const express = require('express');
const router = express.Router();
const {getForm, createForm} = require('./service')
const {verifyToken} = require('../auth/services/verifyToken');

router.get('/', verifyToken, getForm);
router.post('/', verifyToken, createForm);

module.exports = router;