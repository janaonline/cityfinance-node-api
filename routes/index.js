const express = require('express');
const router = express.Router();
const multer = require('multer');

//Define where project photos will be stored
const storage = multer.diskStorage({
    destination: function (request, file, callback) {
        callback(null, 'uploads');
    },
    filename: function (request, file, callback) {
        console.log(file);
        callback(null, file.originalname)
    }
});
const multerUpload = multer({ storage: storage });
/*
* END MULTER
*/
const passport = require('passport');
const ulbUploadService = require("../service/ulb-upload")

//--> State Routes <---//
const State = require("../models/Schema/State");
router.get('/state', passport.authenticate('jwt', {session: false}), State.get);
router.put('/state/:_id', passport.authenticate('jwt', {session: false}), State.put);
router.post('/state', passport.authenticate('jwt', {session: false}), State.post);
router.delete('/state/:_id', passport.authenticate('jwt', {session: false}), State.delete);


//--> ULB Type Routes <---//
const UlbType = require("../models/Schema/UlbType");
router.get('/UlbType', passport.authenticate('jwt', {session: false}), UlbType.get);
router.put('/UlbType/:_id', passport.authenticate('jwt', {session: false}), UlbType.put);
router.post('/UlbType', passport.authenticate('jwt', {session: false}), UlbType.post);
router.delete('/UlbType/:_id', passport.authenticate('jwt', {session: false}), UlbType.delete);

//--> ULB Routes <---//
const Ulb = require("../models/Schema/Ulb");
router.get('/Ulb', passport.authenticate('jwt', {session: false}), Ulb.get);
router.put('/Ulb/:_id', passport.authenticate('jwt', {session: false}), Ulb.put);
router.post('/Ulb', passport.authenticate('jwt', {session: false}), Ulb.post);
router.delete('/Ulb/:_id', passport.authenticate('jwt', {session: false}), Ulb.delete);
router.post('/bulk/ulb-upload',multerUpload.single("files"),(req, res, next) => {
    ulbUploadService.create(req, res);
});

//--> Upload Ledger Routes <---//
const ledgerUpload = require("./ledger/upload_ledger");
router.post("/uploadLedger",multerUpload.single('csv'),ledgerUpload);


const BulkUpload = require("./bulk-upload");
router.post("/processData", BulkUpload.processData);
router.get("/getProcessStatus/:_id", BulkUpload.getProcessStatus);

//---> Line Item Routes <---//
const LineItem = require("../models/Schema/LineItem");
router.get('/LineItem', passport.authenticate('jwt', {session: false}), LineItem.get);
router.put('/LineItem/:_id', passport.authenticate('jwt', {session: false}), LineItem.put);
router.post('/LineItem', passport.authenticate('jwt', {session: false}), LineItem.post);
router.delete('/LineItem/:_id', passport.authenticate('jwt', {session: false}), LineItem.delete);

//---> Ulb Ranking Routes <---//
const ReportRoutes = require("../routes/report/route");
router.use("/report",ReportRoutes);


const fileUploadRoutes = require("../routes/file-upload");
router.use("/",(r,s,n)=>{console.log("reached"); n(); },fileUploadRoutes);

// Get state list
router.get('/states',State.get);

// Get ULBs by state
router.get('/states/:stateCode/ulbs', Ulb.getByState);

// Get All Ulbs
router.get('/ulbs', Ulb.getAllUlbs);

module.exports = router;
