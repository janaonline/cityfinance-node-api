const express = require('express');
const router = express.Router();
const {verifyToken} = require('../auth/services/verifyToken');
const {getForm, createOrUpdateForm, twentyEightSlbFormFormTargetValuesUpdation} = require('./service');

router.get('/', verifyToken, getForm);
router.post('/', verifyToken, createOrUpdateForm);


router.post('/twentyEightSlbFormFormTargetValuesUpdation', twentyEightSlbFormFormTargetValuesUpdation)
module.exports = router;