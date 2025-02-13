const express = require('express');
const router = express.Router();
const { getForm, createOrUpdateForm, createOrUpdate, getView,getCsvForPropertyTaxMapper } = require('./service');
const { checkValidation } = require('./validation');
const { verifyToken } = require('../auth/services/verifyToken')

router.get('/', verifyToken, getForm);
router.post('/', verifyToken, createOrUpdateForm); /// old year

// New Year
router.post('/create-form', verifyToken, createOrUpdate); /// new year
router.get("/view", verifyToken, getView);
router.get("/getPtoData",getCsvForPropertyTaxMapper)
module.exports = router;