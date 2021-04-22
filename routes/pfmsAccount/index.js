const express = require('express');
const { verify } = require('jsonwebtoken');
const router = express.Router();
const { verifyToken } = require('../auth/services/verifyToken')
const { createOrUpdate } = require('./service');
router.post('/create', verifyToken, createOrUpdate);

module.exports = router;
