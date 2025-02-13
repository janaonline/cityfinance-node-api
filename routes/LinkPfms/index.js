const express = require('express');
const router = express.Router();
const {getForm, createOrUpdateForm} = require('./service');
const {verifyToken} = require('../auth/services/verifyToken')
const {transformResponse,transformPayload} = require("./middlewares")
router.get('/', verifyToken, getForm,transformResponse);
router.post('/', verifyToken,transformPayload ,createOrUpdateForm);

module.exports = router;