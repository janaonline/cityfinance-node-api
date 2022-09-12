const express = require('express');
const router = express.Router();
const { verifyToken } = require('../auth/services/verifyToken')

const { getAll, get2223 } = require('./service')
const { create } = require('./service')
const { update } = require('./service')


router.get('/getAll', verifyToken, getAll)
router.get('/get2223', verifyToken, get2223)
router.put('/update', update)
router.post('/create', verifyToken, create)


module.exports = router;