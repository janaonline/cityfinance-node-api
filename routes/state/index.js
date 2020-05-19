const passport = require('passport');
const express = require('express');
const router = express.Router();
const State = require('./service')
const verifyToken = require('../auth/service').verifyToken;
const constants = require('../../service/inactivityTimeout');
router.get(
    '/state',
    State.get
);
router.post('/states-with-ulb-count',State.getStateListWithCoveredUlb);
router.put(
    '/state/:_id',
    constants,
    verifyToken,
    State.put
);
router.post('/state',
    constants,
    verifyToken,
    State.post
);

router.delete(
    '/state/:_id',
    constants,
    verifyToken,
    State.delete
);

module.exports = router;