const express = require("express");
const router = express.Router();
const { get, post, search, bulkPost } = require("./service");
const verifyToken = require("../auth/services/verifyToken").verifyToken;
const multer = require("multer");
const upload = multer({ dest: "uploads/resource" });

router.get("/", get);
router.post("/", post);
router.post("/bulk", upload.single("excel"), bulkPost);
router.get("/search", search);
module.exports = router;
