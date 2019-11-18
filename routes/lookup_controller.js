const express = require('express');
const router = express.Router();

const lookupService = require('../service/lookup_service');
const State = require('../models/Schema/State')
const Ulb = require('../models/Schema/Ulb')

// Get state list
router.get('/states',State.get);

// Get ULBs by state
router.get('/states/:stateCode/ulbs', Ulb.getByState);

router.get('/ulbs', Ulb.getAllUlbs);


module.exports = router;