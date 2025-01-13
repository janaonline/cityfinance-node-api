const express = require("express");
const router = express.Router();
const nationalDashboard = require("./nationalDashboard");

router.get("/data-availability", nationalDashboard.dataAvailability);

module.exports = router;