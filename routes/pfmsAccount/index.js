const express = require('express');
const { verify } = require('jsonwebtoken');
const router = express.Router();
const { verifyToken } = require('../auth/services/verifyToken')
const { createOrUpdate } = require('./service');
const { get } = require('./service')
router.post('/create', verifyToken, createOrUpdate);
router.get('/get/:design_year/:ulb', verifyToken, get)
router.get('/get/:design_year', verifyToken, get)
module.exports = router;
