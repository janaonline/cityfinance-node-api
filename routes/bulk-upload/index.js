const verifyToken = require('../auth/services/verifyToken').verifyToken;
const BulkUpload = {
    processData: require('./process'),
    getProcessStatus: require('./get-process-status'),
    ulbLocationUpdate: require('./ulb-location-update'),
    stateUlbCountUpdate: require("./state-ulb-count-update"),
    csvToJSON: require('./csv-to-json'),
    uploadLedger: require('./upload-ledger'),
    bondUpload: require('./bonds-upload'),
    ulbUlpload: require('./ulb-upload'),
    overallUlbUlpload: require('./overall-ulb-upload'),
    resourceUpload: require('./resource-upload'),
    getResource: require('./resource-upload').getResource

}

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

const storage2 = multer.diskStorage({

    destination: function (req, file, cb) {
        cb(null, 'uploads/resource')
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname.replace(/ /g, '_'))
    }
});
const multerUpload = multer({ storage: storage1 });
const resourceMulterUpload = multer({ storage: storage2 });
const router = express.Router();

router.post('/upload-resource', resourceMulterUpload.fields([{ name: 'pdf' }, { name: 'image' }]), BulkUpload.resourceUpload);
router.get('/resource/all', BulkUpload.getResource);

router.post('/processData', verifyToken, BulkUpload.processData);
router.get('/getProcessStatus/:_id', verifyToken, BulkUpload.getProcessStatus);
router.post('/uploadLedger', multerUpload.single('csv'), BulkUpload.csvToJSON, BulkUpload.uploadLedger);

router.post('/bulk/bonds-upload', multerUpload.single('files'), BulkUpload.bondUpload);
router.post('/bulk/ulb-upload', multerUpload.single('file'), BulkUpload.ulbUlpload);
router.post('/bulk/overall-ulb-upload', multerUpload.single('files'), BulkUpload.overallUlbUlpload);
router.post("/bulk/ulb-location-update", multerUpload.single('csv'), BulkUpload.csvToJSON, BulkUpload.ulbLocationUpdate);
router.post("/bulk/state-ulb-count-update", multerUpload.single('csv'), BulkUpload.csvToJSON, BulkUpload.stateUlbCountUpdate);
router.post("/bulk/ulb-name-update", multerUpload.single('csv'), BulkUpload.csvToJSON, BulkUpload.ulbLocationUpdate.nameUpdate);
router.post("/bulk/ulb-signup", multerUpload.single('csv'), BulkUpload.csvToJSON, BulkUpload.ulbLocationUpdate.signup);
router.post("/bulk/UA-create", multerUpload.single('csv'), BulkUpload.csvToJSON, BulkUpload.ulbLocationUpdate.createUA);
router.post("/bulk/deleteNullUA", BulkUpload.ulbLocationUpdate.deleteNullNamedUA)
router.post("/bulk/ulbUpdate", multerUpload.single('csv'), BulkUpload.csvToJSON, BulkUpload.ulbLocationUpdate.updateUlb);
router.post("/bulk/updateUA", BulkUpload.ulbLocationUpdate.updateUA);

module.exports = router;
