const passport = require('passport');
const express = require('express');
const router = express.Router();

//--> ULB Type Routes <---//
const UlbType = require('./service');
router.get(
    '/UlbType',
    passport.authenticate('jwt', { session: false }),
    UlbType.get
);
router.put(
    '/UlbType/:_id',
    passport.authenticate('jwt', { session: false }),
    UlbType.put
);
router.post(
    '/UlbType',
    passport.authenticate('jwt', { session: false }),
    UlbType.post
);
router.delete(
    '/UlbType/:_id',
    passport.authenticate('jwt', { session: false }),
    UlbType.delete
);
module.exports = router;