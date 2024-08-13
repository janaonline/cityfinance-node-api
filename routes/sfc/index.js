const express = require('express');
const router = express.Router();
const { verifyToken } = require('../auth/services/verifyToken');
const { getForm, createOrUpdateForm, reviewAction } = require('./service');

router.get('/form', verifyToken, getForm);
router.post('/create-form', verifyToken, createOrUpdateForm);
router.post("/reviewAction", verifyToken, reviewAction)

module.exports = router;