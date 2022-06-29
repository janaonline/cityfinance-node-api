const express = require('express');
const router = express.Router();
const {updateForm, getForms} = require('./service');
const { verifyToken} = require('./../auth/services/verifyToken')

router.post('/', verifyToken, getForms);
router.patch('/', verifyToken, updateForm);

module.exports = router;