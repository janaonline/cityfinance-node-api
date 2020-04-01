const express = require('express');
const router = express.Router();
const service = require('./service');

router.post('/register',service.register);
router.post('/login', service.login);
router.get('/email_verification',service.verifyToken, service.emailVerification);
router.post('/forgot_password',service.forgotPassword);
router.post('/reset_password',service.verifyToken,service.resetPassword);

module.exports = router;
