const express = require("express");
const router = express.Router();
const nationalDashboard = require("./nationalDashboard");
const cacheMiddleware = require('../../../middlewares/cacheMiddleware');

router.get("/data-availability", cacheMiddleware('dashboard'), nationalDashboard.dataAvailability);

module.exports = router;