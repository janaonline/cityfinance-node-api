const passport = require('passport');
const express = require('express');
const router = express.Router();
const verifyToken = require('../auth/services/verifyToken').verifyToken;
//--> ULB Type Routes <---//
const FinancialYear = require('./service');
router.get('/financial-year', FinancialYear.get);

router.get(
    '/dynamic-financial-year',
    FinancialYear.yearsContainingFinancialYear
);

router.put('/financial-year/:_id', verifyToken, FinancialYear.put);

router.get('/access', verifyToken, FinancialYear.access);


router.post('/financial-year', verifyToken, FinancialYear.post);
router.delete('/financial-year/:_id', verifyToken, FinancialYear.delete);
module.exports = router;
