const express = require("express");
const router = express.Router();
const { fileUpload, getIndicatorData } = require("./service");
const verifyToken = require("../auth/services/verifyToken").verifyToken;

const multer = require("multer");
const upload = multer({ dest: "uploads/resource" });

const { userAuth } = require("../../middlewares/actionUserAuth");

router.post("/fileUpload", upload.single("excel"), fileUpload);
router.get("/indicators", getIndicatorData);

module.exports = router;
