const express = require('express');
const router = express.Router();

const getSignedUrl = require("./getSignedUrl");
const putDataIntoFile = require("./putDataIntoFile");

/* GET home page. */
router.post('/getSignedUrl', getSignedUrl);
router.put('/putDataIntoFile/:path',(r,s,n)=>{console.log("REched putDataIntoFile");n(); }, putDataIntoFile);

module.exports = router;
