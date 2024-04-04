const express = require('express');
const router = express.Router();
const multer = require('multer');
const { verifyToken } = require('../auth/services/verifyToken')
const { get, CreateorUpdate, readCSV } = require('./service')
const {get2223} = require('./service2223');




router.get('/grant-claim/get', verifyToken, get)
router.post('/grant-claim/create', verifyToken, CreateorUpdate)
router.get('/grant-claim/get2223',verifyToken, get2223);
// router.post('/grant-claim/readCSV', multerUpload.single('csv'), csvToJSON, readCSV)
module.exports = router;