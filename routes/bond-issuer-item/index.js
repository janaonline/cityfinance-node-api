const express = require('express');
const router = express.Router();
const BondIssuerItem = require('./service');
const passport = require('passport');
router.get('/BondIssuer', BondIssuerItem.getJson);
router.get('/Bond/Ulbs', BondIssuerItem.BondUlbs);

router.get('/BondIssuerItem', BondIssuerItem.get);
router.put(
    '/BondIssuerItem/:_id',
    passport.authenticate('jwt', { session: false }),
    BondIssuerItem.put
);
router.post(
    '/BondIssuerItem',
    // passport.authenticate('jwt', { session: false }),
    BondIssuerItem.post
);
router.post(
    '/BondIssuerItem/getList',
    // passport.authenticate('jwt', { session: false }),
    BondIssuerItem.get
);
router.delete(
    '/BondIssuerItem/:_id',
    // passport.authenticate('jwt', { session: false }),
    BondIssuerItem.delete
);
module.exports = router;