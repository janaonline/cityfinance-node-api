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
    getResource: require('./resource-upload').getResource,
    waterrejenuvation: require('./water-rejenuvation'),
    excelToJSON: require('./excel-to-json'),

}
const { readCSV, uploadGrantData, grantStatusCSV, updateLatLong, updatepopulation, updateyearkeys } = require('../grant-claim/service')
const { userAuth } = require("../../middlewares/actionUserAuth");
const express = require('express');
const multer = require('multer');
const path = require('path');
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

const fileFilter = (allowedExtensions) => (req, file, cb) => {
    const extension = path.extname(file.originalname);
    if (allowedExtensions.includes(extension)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file extension'));
    }
};

const multerUpload = multer({ storage: storage1 });
const resourceMulterUpload = multer({ storage: storage2 });
const multerUploadEXCEL = multer({ storage: storage1, fileFilter: fileFilter(['.xls', '.xlsx'])});
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
router.delete("/bulk/deleteNullUA", BulkUpload.ulbLocationUpdate.deleteNullNamedUA)
router.post("/bulk/ulbUpdate", multerUpload.single('csv'), BulkUpload.csvToJSON, BulkUpload.ulbLocationUpdate.updateUlb);
router.post("/bulk/updateUA", BulkUpload.ulbLocationUpdate.updateUA);
router.post("/bulk/updateState", BulkUpload.ulbLocationUpdate.updateState);
router.post("/bulk/createGrantType", BulkUpload.ulbLocationUpdate.createGrantType);
router.post("/bulk/updateUser", BulkUpload.ulbLocationUpdate.updateUser);
router.post("/bulk/updateUserFinal", BulkUpload.ulbLocationUpdate.updateUserFinal);
router.post("/bulk/getNodal", BulkUpload.ulbLocationUpdate.getNodalOfficers);
router.post("/bulk/updateNodalFinal", BulkUpload.ulbLocationUpdate.updateUserData_Final);
router.post("/bulk/addULBToUA", BulkUpload.ulbLocationUpdate.addULBsToUA);
router.post("/bulk/signUpNew", verifyToken, BulkUpload.ulbLocationUpdate.signupNew);
router.get("/bulk/ulbCount", BulkUpload.ulbLocationUpdate.getULBCount);
router.post('/grant-claim/readCSV', multerUpload.single('csv'), BulkUpload.csvToJSON, readCSV)
router.post('/grant-claim/granted', multerUpload.single('csv'), BulkUpload.csvToJSON, uploadGrantData)
router.post('/grant-claim/grantStatusCSV', multerUpload.single('csv'), BulkUpload.csvToJSON, grantStatusCSV)
router.post('/updateLatLong', multerUpload.single('csv'), BulkUpload.csvToJSON, updateLatLong)
router.post('/updatepopulation', multerUpload.single('csv'), BulkUpload.csvToJSON, updatepopulation)
router.post('/updateyearkeys', multerUpload.single('csv'), BulkUpload.csvToJSON, updateyearkeys)

const expectedSheetNames = ['stateDetails', 'waterBodies', 'reuseWater', 'serviceLevelIndicators'];
router.post('/bulk/water-rejenuvation', verifyToken, userAuth, multerUploadEXCEL.single('excelFile'), BulkUpload.excelToJSON(expectedSheetNames), BulkUpload.waterrejenuvation)

module.exports = router;
