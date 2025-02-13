const express = require("express");
const router = express.Router();
const { create, read, update, remove, readById } = require("./service");
const verifyToken = require("../auth/services/verifyToken").verifyToken;

// create
router.post("/dashboardHeaders",  create);
// read
router.get("/dashboardHeaders", read);
// read by id
router.get("/dashboardHeaders/:id", readById);
// update by id
router.put("/dashboardHeaders/:id", verifyToken, update);
// delete by id
router.delete("/dashboardHeaders/:id", verifyToken, remove);

module.exports = router;
