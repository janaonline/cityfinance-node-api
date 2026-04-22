const express = require('express');
const morgan = require('morgan');
const { logger } = require('../middlewares/loggermiddleware');
// const { verifyToken } = require('../routes/auth/services/verifyToken');

const router = express.Router();
// @Base Url
router.use((req, res, next) => {
	req['currentUrl'] = `${req.protocol + '://' + req.headers.host}`;
	next();
});

// @Morgan logger
router.use(logger.setResponseBody);
morgan.token('request', function (req, res) {
	try {
		logger.createLog(req, res);
	} catch (err) {
		console.log('token not created ::', err.message);
	}
});
router.use(morgan(':request'));

// Calculate fiscal ranking score
router.use('/scoring-fr', require('./scoringFR'));

// Dalgo
router.use('/dalgo', require('./dalgo'));

// Download logs - User Info.
router.use('/file-download-log', require('./file-download-log'));

// Ulb feedback form.
router.use('/ulb-feedback', require('./ulb-feedback-form'));

// Budget Documents.
router.use('/budget-documents', require('./budget-documents'));

// Request Demo.
router.use('/request-demo', require('./request-demo'));

// Public Dashboard.
router.use('/dashboard', require('./dashboards'));

// Get latest provisional year.
router.use('/common', require('./common'));

// Bond Issuances
router.use('/bond-issuances', require('./bond-issuances'));

// Ledgers.
router.use('/ledger', require('./ledger'));

// Token-based private file download (no raw S3 path or signed URL exposed).
router.use('/file', require('./file'));

// Get signed url
const { generateGetSignedUrl } = require('../service/s3-services');
const { verifyToken } = require('../routes/auth/services/verifyToken');

router.post('/get-signed-url', verifyToken, async (req, res) => {
  try {
    const { fileUrl } = req.body;

    if (!fileUrl) {
      return res.status(400).json({
        success: false,
        message: 'fileUrl is required',
      });
    }

    const signedUrl = await generateGetSignedUrl(fileUrl);

    return res.status(200).json({
      success: true,
      message: 'Signed URL generated successfully',
      data: { signedUrl },
    });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate signed URL',
    });
  }
});

module.exports = router;
