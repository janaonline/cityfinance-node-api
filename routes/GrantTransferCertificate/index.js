const express = require('express');
const router = express.Router();
const { getForm, createForm, fileDeFuncFiles,OldFileDeFuncFiles,getInstallmentForm,createOrUpdateInstallmentForm, installmentAction } = require('./service')
const { verifyToken } = require('../auth/services/verifyToken');
const {changePayloadStructure} = require("./middlewares")
router.get('/', verifyToken, getForm);
router.post('/', verifyToken, createForm);
router.get('/fileDeFuncFiles',fileDeFuncFiles);
router.get('/OldFileDeFuncFiles',OldFileDeFuncFiles);
router.get("/installmentForm",verifyToken,getInstallmentForm)
router.post("/installmentForm",verifyToken,changePayloadStructure,createOrUpdateInstallmentForm)
router.post("/installmentAction",verifyToken, installmentAction)

module.exports = router;