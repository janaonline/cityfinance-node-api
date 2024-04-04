const express = require("express");
const router = express.Router();
const {getValues , createValue} = require('./service');

router.get('/',getValues);
router.post('/', createValue);

module.exports = router;