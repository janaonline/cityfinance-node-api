const express = require('express');
const router = express.Router();
const {updateForm, getForms, annualaccount, masterAction, getMasterAction} = require('./service');
const { verifyToken} = require('./../auth/services/verifyToken')

router.post('/', verifyToken, getForms);
router.post('/aa', verifyToken, annualaccount);
router.patch('/', verifyToken, updateForm);

router.post('/masterAction', verifyToken, masterAction);
router.post('/getMasterAction', verifyToken, getMasterAction)

module.exports = router;