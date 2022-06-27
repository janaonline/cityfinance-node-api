const express = require('express');
const router = express.Router();
const {createForm, getForm, updateForm} = require('./service');
const {verifyToken} = require('../auth/services/verifyToken')

router.get('/', verifyToken, getForm);
router.post('/', verifyToken, createForm);
router.patch('/', verifyToken, updateForm);

module.exports = router;