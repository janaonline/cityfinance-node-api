const express = require("express");
const router = express.Router();
const { verifyToken } = require("../auth/services/verifyToken");
const shared = require("./shared/index");
// router.use(verifyToken);
router.use("/all-dashboard", shared);
module.exports = router;
