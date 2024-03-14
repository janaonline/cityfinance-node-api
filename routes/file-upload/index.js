const express = require('express');
const router = express.Router();

const getSignedUrl = require("./getSignedUrl");
const putDataIntoFile = require("./putDataIntoFile");

/* GET Signed Url to upload content. */
// router.post('/getSignedUrl', getSignedUrl);

// Upload content of file to particular path provided by getSignedUrl
// router.put('/putDataIntoFile/:path',(r,s,n)=>{console.log("REched putDataIntoFile");n(); }, putDataIntoFile);

module.exports = router;
