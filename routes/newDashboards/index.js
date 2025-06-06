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
router.post("/about-indicator-comp", peerComp);
const cacheMiddleware = require('../../middlewares/cacheMiddleware');
const {
  dataAvailability,
  chartData,
  topPerForming,
  chartData2,
  cardsData,
  tableData,
  yearlist,
} = require("./ownRevenue");

const {
  dataAvailabilityState,
  nationalDashRevenue,
  getStatewiseDataAvail,
  nationalDashExpenditure,
  nationalDashOwnRevenue,
  nationalDashCapexpense,
} = require("./national");

const {
  scatterMap,
  revenue,
  listOfIndicators,
  stateRevenueTabs,
  ulbsByPopulation,
  serviceLevelBenchmark,
  getFYsWithSpecification,
  getFYsSLB,
  indicatorDump,
  stateDashAvgs,
} = require("./state");

router.use("/all-dashboard", shared);
router.post("/data-available", cacheMiddleware('dashboard'),dataAvailability);
router.post("/yearList", cacheMiddleware('dashboard'),yearlist);
router.post("/chart-data",cacheMiddleware('dashboard'), chartData2);
router.post("/cards-data", cacheMiddleware('dashboard'),cardsData);
router.post("/table-data", cacheMiddleware('dashboard'),tableData);
router.post("/topPerformance",cacheMiddleware('dashboard'), topPerForming);

router.post("/state-scatter", scatterMap);

//state dashboard
router.post("/state-revenue", revenue);
router.get("/state-list-of-indics", listOfIndicators);
router.get("/state-revenue-tabs", stateRevenueTabs);
router.get("/state-ulbs-grouped-by-population", ulbsByPopulation);
router.post("/state-slb", serviceLevelBenchmark);
router.get("/get-FYs-with-specification", cacheMiddleware('dashboard'), getFYsWithSpecification);
router.get("/get-FYs-slb", getFYsSLB);
router.get("/indicatorCSV", indicatorDump);
router.post("/state-dashboard-averages", stateDashAvgs);

// national dashboard
router.get("/national-dashboard/data-availability", dataAvailabilityState);
router.get("/national-dashboard/revenue", nationalDashRevenue);
router.get("/national-dashboard/expenditure", nationalDashExpenditure);
router.get("/national-dashboard/own-revenue", nationalDashOwnRevenue);
router.get("/national-dashboard/capital-expenditure", nationalDashCapexpense);
router.get("/get-statewise-data-availability", cacheMiddleware('dashboard'), getStatewiseDataAvail);

//slb-specific-metrics
const {slbFrontPanel} = require('./slb');
router.get("/slb-specific-metrics",slbFrontPanel);

module.exports = router;
