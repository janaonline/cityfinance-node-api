const express = require('express');
const router = express.Router();
const {getFormById} = require("./services");
const { verifyToken } = require('../auth/services/verifyToken')
router.get("/:id",getFormById)
// router.get('/', verifyToken, );
// router.post('/', verifyToken,changeRequestBody, createOrUpdateForm);
// router.get('/defunctGFCODF', defunct);
module.exports = router;