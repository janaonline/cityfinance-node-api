const express = require('express');
const router = express.Router();
const LineItem = require('./service');
const verifyToken = require('../auth/services/verifyToken').verifyToken;

router.get("/LineItem", LineItem.get);
router.put(
    '/LineItem/:_id',
    verifyToken,
    LineItem.put
);
router.post(
    '/LineItem',
    verifyToken,
    LineItem.post
);
router.delete(
    '/LineItem/:_id',
    verifyToken,
    LineItem.delete
);
module.exports = router;