const express = require("express");
const router = express.Router();
const { get, post, search, bulkPost, getYears } = require("./service");
const multer = require("multer");
const upload = multer({ dest: "uploads/resource" });

router.get("/", get);
router.get("/allYears", getYears);
router.post("/", post);
router.post("/bulk", upload.single("excel"), bulkPost);
router.get("/search", search);
module.exports = router;
