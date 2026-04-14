const express = require('express');
const router = express.Router();
const rateLimit = require("express-rate-limit");
const DownloadLog = require('./service');
const verifyToken = require('../auth/services/verifyToken').verifyToken;

const htmlToPdfLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.HTML_TO_PDF_RATE_LIMIT_MAX || 30),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many PDF generation requests. Please try again later.",
  },
});

router.get("/download-log", verifyToken, DownloadLog.get);
router.post("/download-log", verifyToken, DownloadLog.post);
router.post("/download/pdf", verifyToken, htmlToPdfLimiter, DownloadLog.HtmlToPdf);

module.exports = router;
