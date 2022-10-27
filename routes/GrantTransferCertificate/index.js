const express = require('express');
const router = express.Router();
const { getForm, createForm, fileDeFuncFiles } = require('./service')
const { verifyToken } = require('../auth/services/verifyToken');

router.get('/', verifyToken, getForm);
router.post('/', verifyToken, createForm);
router.get('/fileDeFuncFiles',fileDeFuncFiles);

module.exports = router;