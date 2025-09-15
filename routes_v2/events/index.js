const express = require('express');
const router = express.Router();
const { verifyToken } = require("../../routes/auth/services/verifyToken");
const service = require("./service");

router.get('/getRegistrationForm', verifyToken, service.getForm);
router.post('/postRegistrationData', verifyToken, service.postData);
router.get('/getRegistrationDataDump', service.getDump);

module.exports = router;
