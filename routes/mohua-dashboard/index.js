const express = require('express');
const router = express.Router();
const { verifyToken } = require('../auth/services/verifyToken')


const { getCards, getForm, getTable } = require('./service')
router.get('/cards', verifyToken, getCards)
router.get('/forms/:design_year', verifyToken, getForm)
router.get('/table', verifyToken, getTable)



module.exports = router;