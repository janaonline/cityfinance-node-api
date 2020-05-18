const passport = require('passport');
const express = require('express');
const router = express.Router();
const State = require('./service')
const verifyToken = require('../auth/service').verifyToken;
const constants = require('../../service/inactivityTimeout');

router.use(constants);

router.get(
    '/state',
    State.get
);
router.put(
    '/state/:_id',
    verifyToken,
    State.put
);
router.post('/state',
    State.post
);

router.delete(
    '/state/:_id',
    verifyToken,
    State.delete
);
router.post('/states-with-ulb-count',State.getStateListWithCoveredUlb);
module.exports = router;