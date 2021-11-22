const express = require('express');
const router = express.Router();
const multer = require('multer');
const { verifyToken } = require('../auth/services/verifyToken')
const { get, CreateorUpdate, readCSV } = require('./service')




router.get('/grant-claim/get', verifyToken, get)
router.post('/grant-claim/create', verifyToken, CreateorUpdate)
// router.post('/grant-claim/readCSV', multerUpload.single('csv'), csvToJSON, readCSV)
module.exports = router;