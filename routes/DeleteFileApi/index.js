const express = require('express');
const router = express.Router();
const { pfmsaccounts,propertyTaxOp,annualAccountData,statefinancecommissionformation,
    propertyTaxFloorRate } = require('./service')

router.get('/pfmsaccounts',pfmsaccounts);
router.get('/propertyTaxOp',propertyTaxOp);
router.get('/annualAccountData',annualAccountData);
router.get('/statefinancecommissionformation',statefinancecommissionformation);
router.get('/propertyTaxFloorRate',propertyTaxFloorRate);

module.exports = router;