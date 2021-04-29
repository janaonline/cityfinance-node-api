const express = require('express');
const { verify } = require('jsonwebtoken');
const router = express.Router();
const { verifyToken } = require('../auth/services/verifyToken')
const { createOrUpdate } = require('./service');
const { action } = require('./service');
const { get } = require('./service')

router.get('/get/:id', verifyToken, get);
router.post('/create', verifyToken, createOrUpdate);
router.post('/action/:_id', verifyToken, action);

module.exports = router;