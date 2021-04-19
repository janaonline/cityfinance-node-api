const express = require("express");
const router = express.Router();
const { create, read, update, remove, readById } = require("./service");
const verifyToken = require("../auth/services/verifyToken").verifyToken;

// create
router.post("/category", create);
// read
router.get("/category", read);
// read by id
router.get("/category/:id", readById);
// update by id
router.put("/category/:id", update);
// delete by id
router.delete("/category/:id", remove);

module.exports = router;
