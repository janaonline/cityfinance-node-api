const express = require("express");
const router = express.Router();
const { verifyToken } = require('../auth/services/verifyToken')
const { CreateorUpdate,createForm, overview,  getAll,getView,approvedByMohua,getFRforms,createTabsFiscalRanking,actionTakenByMoHua, FRUlbFinancialData, FROverAllUlbData,heatMapReport } = require('./service')

router.post("/create", verifyToken, CreateorUpdate);
router.get("/getAll", verifyToken, getAll);
router.post("/create-tabs",verifyToken,createTabsFiscalRanking)
router.get("/view", verifyToken, getView);
router.put("/approvedByMohua", verifyToken, approvedByMohua);
router.get("/get-fr-ulbs",verifyToken,getFRforms);
router.post("/action-by-mohua",verifyToken,actionTakenByMoHua)
router.post("/create-form",verifyToken,createForm);
router.get("/csvFRUlb", FRUlbFinancialData);
router.get('/csvFROverall', FROverAllUlbData);
router.get('/overview/:type', verifyToken,  overview)
router.get("/getStateWiseForm",heatMapReport)


module.exports = router;
