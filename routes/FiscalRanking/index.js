const express = require("express");
const router = express.Router();
const { verifyToken } = require('../auth/services/verifyToken')
const { CreateorUpdate, getView, approvedByMohua, getFRforms, createTabsFiscalRanking, actionTakenByMoHua, FRUlbFinancialData, FROverAllUlbData, getTrackingHistory,heatMapReport, overview, createForm, getAll, freezeForm, errorLogs, backendDataUpload} = require('./service')
const { updateSubmittedDate } = require('./update-submitted-date')
const multer = require('multer');

router.post("/create", verifyToken, CreateorUpdate);
router.get("/getAll", verifyToken, getAll);
// router.post("/create-tabs", verifyToken, createTabsFiscalRanking)
router.get("/view", verifyToken, getView);
router.put("/approvedByMohua", verifyToken, approvedByMohua);
router.get("/get-fr-ulbs", verifyToken, getFRforms);
router.post("/action-by-mohua", verifyToken, actionTakenByMoHua)
router.post("/create-form", verifyToken, createForm);
router.get("/csvFRUlb", FRUlbFinancialData);
router.get('/csvFROverall', FROverAllUlbData);
router.get('/overview/:type', verifyToken, overview)
router.get("/getStateWiseForm", heatMapReport)
router.get("/tracking-history",getTrackingHistory)

//One time API to freeze form FR.
router.put("/freeze-form",freezeForm)
router.get("/get-error-logs", errorLogs)

//Api to update value from backend
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
router.post("/backendDataUpload", upload.single("file"), backendDataUpload);

router.patch("/update-submitted-date", verifyToken, updateSubmittedDate);


module.exports = router;
