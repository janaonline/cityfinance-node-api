const express = require("express");
const router = express.Router();
const { create, read, update, remove, readById } = require("./service");
const verifyToken = require("../auth/services/verifyToken").verifyToken;

// create
router.post("/dashboardMaster",  create);
// read
router.get("/dashboardMaster", verifyToken, read);
// read by id
router.get("/dashboardMaster/:id", verifyToken, readById);
// update by id
router.put("/dashboardMaster/:id", verifyToken, update);
// delete by id
router.delete("/dashboardMaster/:id", verifyToken, remove);

module.exports = router;
