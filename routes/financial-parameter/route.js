const express = require('express');
const router = express.Router();
const FP = require('./index');

router.get("/", FP.get);
router.get("/:_id", FP.getById);
router.post("/", FP.post);
router.put("/:_id", FP.put);
router.delete("/:_id", FP.delete);
module.exports = router;
