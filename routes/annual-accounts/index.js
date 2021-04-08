const express = require('express');
const { verify } = require('jsonwebtoken');
const router = express.Router();
const { verifyToken } = require('../auth/services/verifyToken')
const { sendAnnualAccountsData } = require('./service');

router.post('/annual_accounts_data', verifyToken, sendAnnualAccountsData);

module.exports = router;
