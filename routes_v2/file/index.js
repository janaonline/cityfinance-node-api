'use strict';

const express = require('express');
const router = express.Router();
const { download } = require('./service');

// No auth middleware — the token IS the auth credential (encrypted + expiring)
router.get('/download', download);

module.exports = router;
