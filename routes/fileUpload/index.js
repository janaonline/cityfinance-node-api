const express = require("express");
const router = express.Router();
const { fileUpload, getIndicatorData, deleteALlData, indicatorsYears } = require("./service");
const verifyToken = require("../auth/services/verifyToken").verifyToken;

const multer = require("multer");
const upload = multer({ dest: "uploads/resource" });

const { userAuth } = require("../../middlewares/actionUserAuth");

router.post("/fileUpload", upload.single("excel"), fileUpload);
router.get("/indicators", getIndicatorData);
router.get("/indicatorsYears", indicatorsYears);
router.delete("/indicators", deleteALlData);

module.exports = router;
