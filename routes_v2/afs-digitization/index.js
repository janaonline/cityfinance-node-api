const express = require('express');
const router = express.Router();
const { getAFSFilterData } = require('../afs-digitization/afsFilters');
const { getAFSMetrics } = require("../afs-digitization/afsMetrics");
const { uploadAFSFile, getAFSFile, uploadMiddleware } = require("./afsFiles");
const { uploadAFSExcelFiles, getAFSExcelFile, uploadExcelMiddleware } = require("./afsExcelfiles");



//Afs-filters
router.get('/afs-filters', getAFSFilterData); 

//Afs-metrics
router.get('/afs-metrics', getAFSMetrics);

const { getAFSFormStatus ,getAFSFormStatusByULB} = require("../afs-digitization/afsFormStatus");

router.get('/afs-form-status/:id', getAFSFormStatus);

router.get("/afs-form-status-by-ulb/:ulbId", getAFSFormStatusByULB); 


 // File upload + fetch
router.post("/afs-file", uploadMiddleware, uploadAFSFile);
router.get("/afs-file", getAFSFile);


//excel-file
router.post("/afs-excel-file", uploadExcelMiddleware, uploadAFSExcelFiles);
router.get("/afs-excel-file", getAFSExcelFile);
 
module.exports = router;
