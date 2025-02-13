const express = require("express");
const router = express.Router();
const {
  createLineItems,
  getLineItems,
  createResource,
  getResources,
} = require("./service");
const verifyToken = require("../auth/services/verifyToken").verifyToken;

const { userAuth } = require("../../middlewares/actionUserAuth");

//create
router.post("/lineItem", createLineItems);

//get
router.get("/lineItem", getLineItems);

//create
router.post("/resource", createResource);

//get
router.get("/resource", getResources);

module.exports = router;
