const express = require("express");
const router = express.Router();
const verifyToken = require("../auth/services/verifyToken").verifyToken;
const {
  addKeyword,
  getAllKeyword,
  search,
  searchMarketDashboard,
} = require("./service");

router.get("/recentSearchKeyword", getAllKeyword);

router.post("/recentSearchKeyword", addKeyword);
router.post("/recentSearchKeyword/search", search);
router.post(
  "/recentSearchKeyword/searchMarketDashboard",
  searchMarketDashboard
);
module.exports = router;
