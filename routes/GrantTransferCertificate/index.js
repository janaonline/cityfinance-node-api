const express = require('express');
const router = express.Router();
const { getForm, createForm, fileDeFuncFiles,OldFileDeFuncFiles } = require('./service')
const { verifyToken } = require('../auth/services/verifyToken');

router.get('/', verifyToken, getForm);
router.post('/', verifyToken, createForm);
router.get('/fileDeFuncFiles',fileDeFuncFiles);
router.get('/OldFileDeFuncFiles',OldFileDeFuncFiles);

module.exports = router;