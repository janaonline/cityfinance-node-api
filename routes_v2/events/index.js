const express = require('express');
const router = express.Router();
const { verifyToken } = require("../../routes/auth/services/verifyToken");
const service = require("./service");

router.get('/getForm', verifyToken, service.getForm);
router.post('/postData', verifyToken, service.postData);
router.get('/getDataDump', service.getDump);

module.exports = router;
