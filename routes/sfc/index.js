const express = require('express');
const router = express.Router();
const {verifyToken} = require('../auth/services/verifyToken');
const {getForm, createOrUpdateForm} = require('./service');

router.get('/form', verifyToken, getForm);
router.post('/create-form', verifyToken, createOrUpdateForm);

module.exports = router;