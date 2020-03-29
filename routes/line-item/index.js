const express = require('express');
const router = express.Router();
const LineItem = require('./service');
const passport = require('passport');
router.get(
    '/LineItem',
    passport.authenticate('jwt', { session: false }),
    LineItem.get
);
router.put(
    '/LineItem/:_id',
    passport.authenticate('jwt', { session: false }),
    LineItem.put
);
router.post(
    '/LineItem',
    passport.authenticate('jwt', { session: false }),
    LineItem.post
);
router.delete(
    '/LineItem/:_id',
    passport.authenticate('jwt', { session: false }),
    LineItem.delete
);
module.exports = router;