const express = require('express');
const router = express.Router();
const {getForm, createOrUpdateForm} = require('./service');
const {verifyToken} = require('../auth/services/verifyToken')

router.get('/', verifyToken, getForm);
router.post('/', verifyToken, createOrUpdateForm);

module.exports = router;