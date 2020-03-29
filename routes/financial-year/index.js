const passport = require('passport');
const express = require('express');
const router = express.Router();

//--> ULB Type Routes <---//
const FinancialYear = require('./service');
router.get(
    '/financial-year',
    passport.authenticate('jwt', { session: false }),
    FinancialYear.get
);
router.put(
    '/financial-year/:_id',
    passport.authenticate('jwt', { session: false }),
    FinancialYear.put
);
router.post(
    '/financial-year',
    passport.authenticate('jwt', { session: false }),
    FinancialYear.post
);
router.delete(
    '/financial-year/:_id',
    passport.authenticate('jwt', { session: false }),
    FinancialYear.delete
);
module.exports = router;