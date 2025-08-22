const express = require('express');
const multer = require('multer');
const router = express.Router();
const cacheMiddleware = require('../../middlewares/cacheMiddleware');
const { getBondIssuances, uploadBondsData } = require('./service');
const { getBondData } = require('./service');
const verifyToken = require('../../routes/auth/services/verifyToken').verifyToken;

// Get bonds amount and count.
router.get('/municipal-bonds/:_stateId?', cacheMiddleware('Municipal_Bonds'), getBondIssuances);

// Get bonds data - State dashboard.
router.get('/get-bonds/:_stateId?', cacheMiddleware('Municipal_Bonds'), getBondData);

// Add new records in bonds collection.
// Multer config - temporarily store file.
const upload = multer({ dest: 'temp-uploads/' });
router.post('/upload-bonds', verifyToken, upload.single('file'), uploadBondsData);

module.exports = router;
