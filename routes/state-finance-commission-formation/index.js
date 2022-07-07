const express = require('express');
const router = express.Router();
const {verifyToken} = require('../auth/services/verifyToken');
const {getForm, createOrUpdateForm} = require('./service');

router.get('/', verifyToken, getForm);
router.post('/', verifyToken, createOrUpdateForm);

module.exports = router;