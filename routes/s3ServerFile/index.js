const express = require('express');
const router = express.Router();
const { moveFileS3 } = require('./service');

router.post('/moveFileS3', moveFileS3);

module.exports = router