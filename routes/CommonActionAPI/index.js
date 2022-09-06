const express = require('express');
const router = express.Router();
const {updateForm, getForms, annualaccount} = require('./service');
const { verifyToken} = require('./../auth/services/verifyToken')

router.post('/', verifyToken, getForms);
router.post('/aa', verifyToken, annualaccount);
router.patch('/', verifyToken, updateForm);

module.exports = router;