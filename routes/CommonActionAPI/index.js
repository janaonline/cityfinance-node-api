const express = require('express');
const router = express.Router();
const { updateForm, getForms, annualaccount, masterAction, getMasterAction, sequentialReview, emailEligibilityCheck } = require('./service');
const { verifyToken } = require('./../auth/services/verifyToken')

router.post('/', verifyToken, getForms);
router.post('/aa', verifyToken, annualaccount);
router.patch('/', verifyToken, updateForm);

router.post('/masterAction', verifyToken, emailEligibilityCheck, masterAction);
router.post('/getMasterAction', verifyToken, getMasterAction);
router.post('/sequentialReview', verifyToken, sequentialReview);

module.exports = router;