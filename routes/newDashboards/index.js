const express = require("express");
const router = express.Router();
const { verifyToken } = require("../auth/services/verifyToken");
const shared = require("./shared/index");
const { indicator } = require("./city");
// router.use(verifyToken);
router.use("/all-dashboard", shared);
router.post("/indicator", indicator);
module.exports = router;
