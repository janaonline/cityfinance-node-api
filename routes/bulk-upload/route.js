/*
* Bulk Upload
* */
const express = require('express');
const multer = require('multer');
const storage1 = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "_" + file.originalname)
    }
});
const multerUpload = multer({ storage: storage1 });

const BulkUpload = require('./index');
const router = express.Router();


router.post('/processData', BulkUpload.processData);
router.get('/getProcessStatus/:_id', BulkUpload.getProcessStatus);
router.post('/uploadLedger', multerUpload.single('csv'), BulkUpload.csvToJSON, BulkUpload.uploadLedger);

router.post('/bulk/bonds-upload',multerUpload.single('files'),BulkUpload.bondUpload);
router.post('/bulk/ulb-upload',multerUpload.single('files'),BulkUpload.ulbUlpload);
router.post("/bulk/ulb-location-update", multerUpload.single('csv'), BulkUpload.csvToJSON, BulkUpload.ulbLocationUpdate);
router.post("/bulk/state-ulb-count-update", multerUpload.single('csv'), BulkUpload.csvToJSON,BulkUpload.stateUlbCountUpdate);

module.exports = router;
