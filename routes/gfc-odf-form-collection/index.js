const express = require('express');
const router = express.Router();
const {createorUpdateForm, getForm} = require('./service')
const { verifyToken } = require('../auth/services/verifyToken')

router.get('/', verifyToken, getForm);
router.post('/', verifyToken, createorUpdateForm);

module.exports = router;