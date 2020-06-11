const express = require('express');
const router = express.Router();
const DownloadLog = require('./service');
router.get("/download-log", DownloadLog.get);
router.post("/download-log", DownloadLog.post);
router.post("/download/pdf", DownloadLog.HtmlToPdf);

module.exports = router;