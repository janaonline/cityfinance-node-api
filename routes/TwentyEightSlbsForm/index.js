const express = require('express');
const router = express.Router();
const {verifyToken} = require('../auth/services/verifyToken');
const {getForm, createOrUpdateForm, twentyEightSlbFormFormTargetValuesUpdation} = require('./service');
const {changeApiGetForm,changePayloadForm} = require("./middlewares")
router.get('/', verifyToken, getForm,changeApiGetForm);
router.post('/', verifyToken,changePayloadForm, createOrUpdateForm);


router.post('/twentyEightSlbFormFormTargetValuesUpdation', twentyEightSlbFormFormTargetValuesUpdation)
module.exports = router;