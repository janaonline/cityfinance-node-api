const express = require("express");
const router = express.Router();
const { verifyToken } = require("../auth/services/verifyToken");
const shared = require("./shared/index");
const { indicator } = require("./city");
const {
  dataAvailability,
  chartData,
  topPerForming,
  chartData2,
  cardsData,
  tableData,
} = require("./ownRevenue");
// router.use(verifyToken);
router.use("/all-dashboard", shared);
router.post("/indicator", indicator);
router.post("/data-available", dataAvailability);
router.post("/chart-data", chartData2);
router.post("/cards-data", cardsData);
router.post("/table-data", tableData);
router.post("/topPerformance", topPerForming);
module.exports = router;
