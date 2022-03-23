const express = require("express");
const router = express.Router();
const { verifyToken } = require("../auth/services/verifyToken");
const shared = require("./shared/index");

const {
  indicator,
  aboutCalculation,
  peerComp,
  revenueIndicator,
} = require("./city");
router.post("/indicator", indicator);
router.post("/indicator/revenue", revenueIndicator);
router.get("/about-indicator", aboutCalculation);
router.get("/about-indicator-comp", peerComp);

const {
  dataAvailability,
  chartData,
  topPerForming,
  chartData2,
  cardsData,
  tableData,
  yearlist
} = require("./ownRevenue");
// router.use(verifyToken);
router.use("/all-dashboard", shared);
router.post("/data-available", dataAvailability);
router.post("/yearList", yearlist);
router.post("/chart-data", chartData2);
router.post("/cards-data", cardsData);
router.post("/table-data", tableData);
router.post("/topPerformance", topPerForming);

const { scatterMap, revenue } = require("./state");
router.post("/state-scatter", scatterMap);


//state dashboard
router.post("/state-revenue", revenue)
module.exports = router;
