const express = require('express');
const router = express.Router();

//--> ULB Type Routes <---//
const UlbType = require('./service');
const verifyToken = require('../auth/services/verifyToken').verifyToken;

router.get(
    '/UlbType',
    UlbType.get
);
router.put(
    '/UlbType/:_id',
    verifyToken,
    UlbType.put
);
router.post(
    '/UlbType',
    verifyToken,
    UlbType.post
);
router.delete(
    '/UlbType/:_id',
    verifyToken,
    UlbType.delete
);
module.exports = router;