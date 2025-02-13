const express = require('express');
const router = express.Router();
const BondIssuerItem = require('./service');
const verifyToken = require('../auth/services/verifyToken').verifyToken;

router.get('/BondIssuer', BondIssuerItem.getJson);
router.get('/Bond/Ulbs', BondIssuerItem.BondUlbs);

router.get('/BondIssuerItem', BondIssuerItem.get);
router.put(
    '/BondIssuerItem/:_id',
    verifyToken,
    BondIssuerItem.put
);
router.post(
    '/BondIssuerItem',
    verifyToken,
    BondIssuerItem.post
);
router.post(
    '/BondIssuerItem/getList',
    verifyToken,
    BondIssuerItem.get
);
router.delete(
    '/BondIssuerItem/:_id',
    verifyToken,
    BondIssuerItem.delete
);

router.get(
    '/BondIssuerItem/amount',
    BondIssuerItem.issueSizeAmount
);

module.exports = router;