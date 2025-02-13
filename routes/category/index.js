const express = require("express");
const router = express.Router();
const { create, read, update, remove, readById } = require("./service");
const verifyToken = require("../auth/services/verifyToken").verifyToken;

// create
router.post("/category", verifyToken, create);
// read
router.get("/category", verifyToken, read);
// read by id
router.get("/category/:id", verifyToken, readById);
// update by id
router.put("/category/:id", verifyToken, update);
// delete by id
router.delete("/category/:id", verifyToken, remove);

module.exports = router;
