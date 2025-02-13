const passport = require('passport');
const express = require('express');
const router = express.Router();
const State = require('./service')
const verifyToken = require('../auth/services/verifyToken').verifyToken;
const constants = require('../../service/inactivityTimeout');
router.get(
    '/state',
    State.get
);

router.get(
    '/eligibleStateForms',
    verifyToken,
    State.eligibleStateForms
)
router.get('/nonMillionState', verifyToken, State.isMillionState);
router.post('/states-with-ulb-count', State.getStateListWithCoveredUlb);
router.put(
    '/state/:_id',
    verifyToken,
    State.put
);
router.post('/state',
    verifyToken,
    State.post
);

router.delete(
    '/state/:_id',
    verifyToken,
    State.delete
);

router.post(
    '/state/form',
    verifyToken,
    State.form
);

router.get(
    '/state/form',
    verifyToken,
    State.form
);


router.post(
    '/ulb/form',
    verifyToken,
    State.ulbForm
);

router.get(
    '/ulb/form',
    verifyToken,
    State.ulbForm
);

router.put(
    '/state/form/:_id',
    verifyToken,
    State.updateXvForm
);

router.get('/state/form/all', verifyToken, State.getAllForms);
router.get('/ulb/form/all', verifyToken, State.getAllUlbForms);


module.exports = router;