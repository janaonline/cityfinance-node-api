const express = require("express");
const router = express.Router();
const { verifyToken } = require('../auth/services/verifyToken')
const { CreateorUpdate, getAll,getView } = require('./service')

router.post("/create", verifyToken, CreateorUpdate);
router.get("/getAll", verifyToken, getAll);
router.get("/view", verifyToken, getView);



module.exports = router;
