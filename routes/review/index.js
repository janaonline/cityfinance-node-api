const express = require("express");
const router = express.Router();
const Review = require("./service");
const Review2324 = require("./service2324");
const verifyToken = require("../auth/services/verifyToken").verifyToken;

router.get("/review", verifyToken, Review.get);
router.get("/reviewForms", verifyToken, Review2324.get);
router.get("/ptax-csv-download", Review2324.downloadPTOExcel);
module.exports = router;
