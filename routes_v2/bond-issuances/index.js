const express = require('express');
const router = express.Router();
const cacheMiddleware = require('../../middlewares/cacheMiddleware');
const { getBondIssuances } = require('./service');

// Home page bond issuances data.
router.get(
	'/municipal-bonds/:_stateId?',
	cacheMiddleware('Municipal_Bonds'),
	getBondIssuances
);

module.exports = router;
