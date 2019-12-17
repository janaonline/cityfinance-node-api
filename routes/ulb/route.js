const express = require('express');
const router = express.Router();
const Ulb = require('./index');

router.get("/", Ulb.get);
router.get("/:_id", Ulb.getById);
router.post("/", Ulb.post);
router.put("/:_id", Ulb.put);
router.delete("/:_id", Ulb.delete);
module.exports = router;
