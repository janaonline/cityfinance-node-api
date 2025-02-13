const express = require('express');
const router = express.Router();
const { pfmsaccounts, propertyTaxOp, annualAccountData, statefinancecommissionformation,
    propertyTaxFloorRate, xvfcGrantForm,grantDistribution,waterRejenuvation,
    grantTransCertificate,gfcFormCollection,dataCollectionForm
} = require('./service');

router.get('/pfmsaccounts', pfmsaccounts);
router.get('/propertyTaxOp', propertyTaxOp);
router.get('/annualAccountData', annualAccountData);
router.get('/statefinancecommissionformation', statefinancecommissionformation);
router.get('/propertyTaxFloorRate', propertyTaxFloorRate);
router.get('/xvfcGrantForm', xvfcGrantForm);
router.get('/grantDistribution', grantDistribution);
router.get('/waterRejenuvation', waterRejenuvation);
router.get('/grantTransCertificate', grantTransCertificate);
router.get('/gfcFormCollection', gfcFormCollection);
router.get('/dataCollectionForm', dataCollectionForm);

module.exports = router;