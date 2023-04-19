const express = require('express');
const router = express.Router();
const { getForm, createForm, fileDeFuncFiles,OldFileDeFuncFiles,getInstallmentForm } = require('./service')
const { verifyToken } = require('../auth/services/verifyToken');

router.get('/', verifyToken, getForm);
router.post('/', verifyToken, createForm);
router.get('/fileDeFuncFiles',fileDeFuncFiles);
router.get('/OldFileDeFuncFiles',OldFileDeFuncFiles);
router.get("/installmentForm",verifyToken,getInstallmentForm)

module.exports = router;