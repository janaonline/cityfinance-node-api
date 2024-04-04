const passport = require('passport');
const express = require('express');
const router = express.Router();
const Ulb = require('./service')
const multer = require("multer");
const { allowedRoles } = require('../auth/services/roleAuthorize');
const upload = multer({ dest: "uploads/resource" });
const verifyToken = require("../auth/services/verifyToken").verifyToken;

router.get("/ulb/filtered", Ulb.getFilteredUlb); // ulb have no questionnaire

router.get("/ulb", Ulb.get);
router.get("/ulbName", Ulb.getName);
router.get("/getAllULBS/csv", Ulb.getAllULBSCSV);
router.put("/ulb/:_id", verifyToken, Ulb.put);
router.put("/ulb", Ulb.renameUlb);
router.post("/Ulb", verifyToken, Ulb.post);
router.post("/bulkPost", verifyToken, Ulb.bulkPost);

router.post(
  "/multi-Ulb",
  verifyToken,
  upload.single("excel"),
  Ulb.multiUlbPost
);
router.delete('/Ulb/:_id', verifyToken, Ulb.delete);
router.delete('/Ulb', Ulb.delete_permanent);
router.get('/ulblist', Ulb.getPopulate);
router.post('/ulb-list', Ulb.getUlbsWithAuditStatus);
// Get ULBs by state
router.get('/states/:stateCode/ulbs', Ulb.getByState);
// Get All Ulbs
router.get('/ulbs', Ulb.getAllUlbs);
router.get('/ulb/:_id', Ulb.getUlbById);

// Get OverallUlb
router.get("/overall-ulb", Ulb.getOverallUlb);
router.get('/ulb-by-code', Ulb.getUlbByCode);

//get all ulbs in uas of a state
router.get('/state/uas-ulb', verifyToken, Ulb.getUlbInUas);

//ulbs forms to display
router.get('/eligibleULBForms', verifyToken, Ulb.eligibleULBForms)
router.get('/getUlbDatafromGeoUrban', Ulb.getUlbDatafromGeoUrban)

//truncate sbCode
router.get('/truncateSbCode',Ulb.truncateSbCode);
router.put('/updateData', verifyToken, allowedRoles(['MoHUA']),Ulb.updateFields)
module.exports = router;