const passport = require('passport');
const express = require('express');
const router = express.Router();
const State = require('./service')

router.get(
    '/state',
    State.get
);
router.put(
    '/state/:_id',
    passport.authenticate('jwt', { session: false }),
    State.put
);
router.post(
    '/state',
    passport.authenticate('jwt', { session: false }),
    State.post
);
router.delete(
    '/state/:_id',
    passport.authenticate('jwt', { session: false }),
    State.delete
);
router.post('/states-with-ulb-count', State.getStateListWithCoveredUlb);
module.exports = router;