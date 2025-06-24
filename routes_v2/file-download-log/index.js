const express = require('express');
const router = express.Router();
const service = require('./service');

router.post('/userInfo', service.userInfo);
router.get('/userInfo', service.getUserInfo);
router.get('/user-download-dump', service.exportUserDownloadExcel);

module.exports = router;
