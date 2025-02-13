const express = require('express');
const router = express.Router();
const {createOrUpdateForm, getForm, defunct} = require('./service')
const { verifyToken } = require('../auth/services/verifyToken')
const {changeFormGetStructure,changeRequestBody} = require("./middlewares");
router.get('/', verifyToken, getForm,changeFormGetStructure);
router.post('/', verifyToken,changeRequestBody, createOrUpdateForm);
router.get('/defunctGFCODF', defunct);
module.exports = router;