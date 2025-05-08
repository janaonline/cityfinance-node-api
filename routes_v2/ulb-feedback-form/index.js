const express = require('express');
const router = express.Router();
const service = require('./service');
const { verifyToken } = require('../../routes/auth/services/verifyToken')

router.post('/submit-form', verifyToken, service.submitFeedbackForm);
router.get('/view', verifyToken, service.viewFeedbackForm);

module.exports = router;
