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
  yearlist,
} = require("./ownRevenue");

const { dataAvailabilityState, nationalDashRevenue } = require("./national");
// router.use(verifyToken);
router.use("/all-dashboard", shared);
router.post("/data-available", dataAvailability);
router.post("/yearList", yearlist);
router.post("/chart-data", chartData2);
router.post("/cards-data", cardsData);
router.post("/table-data", tableData);
router.post("/topPerformance", topPerForming);

const {
  scatterMap,
  revenue,
  listOfIndicators,
  stateRevenueTabs,
  ulbsByPopulation,
<<<<<<< HEAD
  serviceLevelBenchmark
=======
  getFYsWithSpecification,
>>>>>>> 93e4b5ac78eddaf965bf181479dc01934170a720
} = require("./state");

router.post("/state-scatter", scatterMap);

//state dashboard
router.post("/state-revenue", revenue);
router.get("/state-list-of-indics", listOfIndicators);
router.get("/state-revenue-tabs", stateRevenueTabs);
router.get("/state-ulbs-grouped-by-population", ulbsByPopulation);
<<<<<<< HEAD
router.post("/state-slb", serviceLevelBenchmark);
=======
router.get("/get-FYs-with-specification", getFYsWithSpecification);
>>>>>>> 93e4b5ac78eddaf965bf181479dc01934170a720

//national dashboard
router.get("/national-dashboard/data-availability", dataAvailabilityState);
router.get("/national-dashboard/revenue", nationalDashRevenue);
module.exports = router;
